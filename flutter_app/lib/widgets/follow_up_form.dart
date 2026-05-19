import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';

class FollowUpFormDialog extends StatefulWidget {
  final FollowUp? existing;
  const FollowUpFormDialog({super.key, this.existing});

  @override
  State<FollowUpFormDialog> createState() => _FollowUpFormDialogState();
}

class _FollowUpFormDialogState extends State<FollowUpFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _client, _contact, _size, _desc, _stageNote;
  late TextEditingController _total, _advance, _remaining;
  String? _location, _selectedStyle, _selectedStatus, _selectedStage, _assign;
  String _state = '';
  DateTime? _deadline;
  bool _isEdit = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _isEdit = e != null;

    _client = TextEditingController(text: e?.client ?? '');
    _contact = TextEditingController(text: e?.contact ?? '');
    _size = TextEditingController(text: e?.size ?? '');
    _desc = TextEditingController(text: e?.desc ?? '');
    _stageNote = TextEditingController(text: e?.stageNote ?? '');
    _total = TextEditingController(text: e != null ? e.total.toStringAsFixed(0) : '');
    _advance = TextEditingController(text: e != null ? e.advance.toStringAsFixed(0) : '');
    _remaining = TextEditingController(text: e != null ? e.remaining.toStringAsFixed(0) : '');

    _location = e?.location.isNotEmpty == true ? e!.location : null;
    _state = e?.state ?? '';
    _selectedStyle = e?.style.isNotEmpty == true ? e!.style : null;
    _selectedStatus = e?.status ?? 'Pending';
    _selectedStage = e?.stage.isNotEmpty == true ? e!.stage : null;
    _assign = e?.assign ?? 'Unassigned';

    if (e?.date.isNotEmpty == true) {
      _deadline = DateTime.tryParse(e!.date);
    }
  }

  @override
  void dispose() {
    for (final c in [_client, _contact, _size, _desc, _stageNote, _total, _advance, _remaining]) {
      c.dispose();
    }
    super.dispose();
  }

  void _calcRemaining() {
    final t = double.tryParse(_total.text) ?? 0;
    final a = double.tryParse(_advance.text) ?? 0;
    setState(() => _remaining.text = (t - a).toStringAsFixed(0));
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _deadline ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _deadline = picked);
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedStyle == null) {
      _showError('Please select an Art Style.');
      return;
    }
    if (_deadline == null) {
      _showError('Please select a deadline date.');
      return;
    }

    final crm = Provider.of<CrmProvider>(context, listen: false);
    final total = double.tryParse(_total.text) ?? 0;
    final advance = double.tryParse(_advance.text) ?? 0;

    if (advance > total) {
      _showError('Advance cannot exceed Total Amount.');
      return;
    }

    final dateStr =
        '${_deadline!.year}-${_deadline!.month.toString().padLeft(2, '0')}-${_deadline!.day.toString().padLeft(2, '0')}';

    if (_isEdit) {
      crm.updateFollowUp(widget.existing!.copyWith(
        client: _client.text.trim(),
        contact: _contact.text.trim(),
        location: _location ?? '',
        state: _state,
        style: _selectedStyle!,
        size: _size.text.trim(),
        desc: _desc.text.trim(),
        total: total,
        advance: advance,
        remaining: total - advance,
        date: dateStr,
        status: _selectedStatus!,
        stage: _selectedStage ?? '',
        stageNote: _stageNote.text.trim(),
        assign: _assign ?? 'Unassigned',
      ));
    } else {
      crm.addFollowUp(FollowUp(
        id: DateTime.now().millisecondsSinceEpoch,
        client: _client.text.trim(),
        contact: _contact.text.trim(),
        location: _location ?? '',
        state: _state,
        style: _selectedStyle!,
        size: _size.text.trim(),
        desc: _desc.text.trim(),
        total: total,
        advance: advance,
        remaining: total - advance,
        date: dateStr,
        status: _selectedStatus!,
        stage: _selectedStage ?? '',
        stageNote: _stageNote.text.trim(),
        assign: _assign ?? 'Unassigned',
      ));
    }
    Navigator.pop(context);
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: AppColors.danger,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context, listen: false);
    final assignOptions = ['Unassigned', 'Manager', 'Team',
      ...crm.teamMembers.map((m) => '${m.role}: ${m.name}')];

    return Dialog(
      backgroundColor: const Color(0xFF111111),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.glassBorder),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 680, maxHeight: 700),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 16, 0),
              child: Row(
                children: [
                  Text(
                    _isEdit ? 'Edit Follow-up' : 'Add Follow-up',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textLight,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            const Divider(color: AppColors.glassBorder, height: 16),

            // Scrollable form body
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      _grid([
                        _field('Client Name', _client, required: true),
                        _field('Contact No.', _contact),
                      ]),
                      _grid([
                        _dropdown<String>(
                          'City',
                          _location,
                          cityStateMap.keys.toList()..sort(),
                          (v) {
                            setState(() {
                              _location = v;
                              _state = cityStateMap[v] ?? '';
                            });
                          },
                        ),
                        _readOnly('State', _state),
                      ]),
                      _grid([
                        _dropdown<String>(
                          'Art Style',
                          _selectedStyle,
                          artStyles,
                          (v) => setState(() => _selectedStyle = v),
                          required: true,
                        ),
                        _field('Size', _size, hint: 'e.g. 24x36 inches'),
                      ]),
                      _grid([
                        _numberField('Total Amount (₹)', _total),
                        _numberField('Advance (₹)', _advance),
                      ]),
                      _grid([
                        _readOnlyCtrl('Remaining (₹)', _remaining,
                            color: AppColors.warning),
                        _datePicker(),
                      ]),
                      _grid([
                        _dropdown<String>(
                          'Status',
                          _selectedStatus,
                          followUpStatuses,
                          (v) => setState(() => _selectedStatus = v),
                        ),
                        _dropdown<String>(
                          'Stage',
                          _selectedStage,
                          followUpStages,
                          (v) => setState(() => _selectedStage = v),
                        ),
                      ]),
                      _grid([
                        _dropdown<String>(
                          'Assigned To',
                          _assign,
                          assignOptions,
                          (v) => setState(() => _assign = v),
                        ),
                        _field('Stage Note', _stageNote),
                      ]),
                      const SizedBox(height: 4),
                      _textArea('Description / Artwork Details', _desc,
                          required: true),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              ),
            ),

            // Footer
            const Divider(color: AppColors.glassBorder, height: 16),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _save,
                    child: const Text('Save Changes'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _grid(List<Widget> children) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: LayoutBuilder(builder: (ctx, constraints) {
        if (constraints.maxWidth > 400) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: children
                .map((w) => Expanded(child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: w,
                    )))
                .toList(),
          );
        }
        return Column(children: children.map((w) => Padding(
          padding: const EdgeInsets.only(bottom: 12), child: w)).toList());
      }),
    );
  }

  Widget _field(String label, TextEditingController ctrl,
      {String? hint, bool required = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label(label),
        TextFormField(
          controller: ctrl,
          style: const TextStyle(color: AppColors.textLight, fontSize: 14),
          decoration: InputDecoration(hintText: hint),
          validator: required
              ? (v) => (v == null || v.trim().length < 2) ? 'Required' : null
              : null,
        ),
      ],
    );
  }

  Widget _numberField(String label, TextEditingController ctrl) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label(label),
        TextFormField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          onChanged: (_) => _calcRemaining(),
          style: const TextStyle(color: AppColors.textLight, fontSize: 14),
          decoration: const InputDecoration(hintText: '0'),
        ),
      ],
    );
  }

  Widget _readOnly(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label(label),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0x05FFFFFF),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Text(
            value.isNotEmpty ? value : 'Auto-filled',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 14),
          ),
        ),
      ],
    );
  }

  Widget _readOnlyCtrl(String label, TextEditingController ctrl,
      {Color color = AppColors.textMuted}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label(label),
        TextFormField(
          controller: ctrl,
          readOnly: true,
          style: TextStyle(color: color, fontSize: 14),
          decoration: const InputDecoration(),
        ),
      ],
    );
  }

  Widget _dropdown<T>(String label, T? value, List<T> items,
      void Function(T?) onChanged, {bool required = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label(label),
        DropdownButtonFormField<T>(
          value: value,
          dropdownColor: const Color(0xFF1A1A1A),
          style: const TextStyle(color: AppColors.textLight, fontSize: 14),
          decoration: const InputDecoration(),
          hint: Text('Select $label',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 14)),
          items: items
              .map((i) => DropdownMenuItem<T>(
                    value: i,
                    child: Text(i.toString()),
                  ))
              .toList(),
          onChanged: onChanged,
          validator: required
              ? (v) => v == null ? 'Required' : null
              : null,
        ),
      ],
    );
  }

  Widget _datePicker() {
    final label = _deadline != null
        ? '${_deadline!.day}/${_deadline!.month}/${_deadline!.year}'
        : 'Pick a date';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label('Deadline Date'),
        GestureDetector(
          onTap: _pickDate,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0x0DFFFFFF),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today_outlined,
                    size: 16, color: AppColors.textMuted),
                const SizedBox(width: 8),
                Text(label,
                    style: TextStyle(
                      color: _deadline != null
                          ? AppColors.textLight
                          : AppColors.textMuted,
                      fontSize: 14,
                    )),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _textArea(String label, TextEditingController ctrl,
      {bool required = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label(label),
        TextFormField(
          controller: ctrl,
          maxLines: 3,
          style: const TextStyle(color: AppColors.textLight, fontSize: 14),
          decoration: const InputDecoration(
            hintText: 'Brief description of the art piece...',
          ),
          validator: required
              ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null
              : null,
        ),
      ],
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text,
          style: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w500)),
    );
  }
}
