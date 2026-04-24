import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/stat_card.dart';

class StudentsPage extends StatelessWidget {
  const StudentsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context);
    final fmt = NumberFormat('#,##,##0', 'en_IN');

    double totalFees = 0;
    double totalCharged = 0;
    for (final s in crm.students) {
      totalFees += s.monthlyFee;
      totalCharged += s.chargedFee;
    }
    final pending = totalFees - totalCharged;

    final isWide = MediaQuery.of(context).size.width > 700;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Students Dashboard',
                      style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textLight)),
                  SizedBox(height: 4),
                  Text('Manage student admissions and fee records.',
                      style: TextStyle(
                          color: AppColors.textMuted, fontSize: 13)),
                ],
              ),
            ),
            ElevatedButton.icon(
              onPressed: () => _showStudentForm(context, null),
              icon: const Icon(Icons.person_add_outlined, size: 18),
              label: const Text('Add Student'),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Stats
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              FinanceStatCard(
                  title: 'Expected Monthly Fees',
                  value: '₹ ${fmt.format(totalFees)}'),
              const SizedBox(width: 16),
              FinanceStatCard(
                  title: 'Total Received',
                  value: '₹ ${fmt.format(totalCharged)}',
                  valueColor: AppColors.success),
              const SizedBox(width: 16),
              FinanceStatCard(
                  title: 'Pending Fees',
                  value: '₹ ${fmt.format(pending)}',
                  valueColor: AppColors.warning),
            ],
          ),
        ),
        const SizedBox(height: 24),

        if (crm.students.isEmpty)
          _empty()
        else if (isWide)
          _desktopTable(context, crm, fmt)
        else
          _mobileList(context, crm, fmt),
      ],
    );
  }

  Widget _desktopTable(
      BuildContext context, CrmProvider crm, NumberFormat fmt) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.glassBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowColor: WidgetStateProperty.all(const Color(0xE60F172A)),
          headingTextStyle: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: AppColors.textMuted,
            letterSpacing: 0.5,
          ),
          dataTextStyle:
              const TextStyle(fontSize: 13, color: AppColors.textLight),
          columnSpacing: 16,
          columns: const [
            DataColumn(label: Text('STUDENT NAME')),
            DataColumn(label: Text('CITY')),
            DataColumn(label: Text('COURSE')),
            DataColumn(label: Text('PHONE')),
            DataColumn(label: Text('MONTHLY FEE (₹)')),
            DataColumn(label: Text('RECEIVED (₹)')),
            DataColumn(label: Text('REMAINING (₹)')),
            DataColumn(label: Text('ACTIONS')),
          ],
          rows: crm.students.map((s) {
            final rem = s.monthlyFee - s.chargedFee;
            return DataRow(cells: [
              DataCell(Text(s.name,
                  style: const TextStyle(fontWeight: FontWeight.w600))),
              DataCell(Text(s.location.isNotEmpty ? s.location : '-')),
              DataCell(Text(s.course,
                  style: const TextStyle(color: AppColors.primary))),
              DataCell(Text(s.phone.isNotEmpty ? s.phone : '-')),
              DataCell(Text('₹${fmt.format(s.monthlyFee)}',
                  style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600))),
              DataCell(Text('₹${fmt.format(s.chargedFee)}',
                  style: const TextStyle(
                      color: AppColors.success,
                      fontWeight: FontWeight.w600))),
              DataCell(Text('₹${fmt.format(rem)}',
                  style: TextStyle(
                      color: rem > 0 ? AppColors.warning : AppColors.success,
                      fontWeight: FontWeight.w600))),
              DataCell(Row(
                children: [
                  _actionBtn('₹ Receive', AppColors.primary,
                      () => _showFeeModal(context, s)),
                  const SizedBox(width: 6),
                  _actionBtn('Edit', AppColors.textMuted,
                      () => _showStudentForm(context, s)),
                  const SizedBox(width: 6),
                  _iconBtn(Icons.delete_outline, AppColors.danger,
                      () => _confirmDelete(context, crm, s)),
                ],
              )),
            ]);
          }).toList(),
        ),
      ),
    );
  }

  Widget _mobileList(
      BuildContext context, CrmProvider crm, NumberFormat fmt) {
    return Column(
      children: crm.students.map((s) {
        final rem = s.monthlyFee - s.chargedFee;
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.glassBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(s.name,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textLight)),
                  ),
                  Text(s.course,
                      style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600)),
                ],
              ),
              const SizedBox(height: 4),
              Text('${s.phone}  •  ${s.location}',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textMuted)),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _fin('Monthly', '₹${fmt.format(s.monthlyFee)}',
                      AppColors.primary),
                  _fin('Received', '₹${fmt.format(s.chargedFee)}',
                      AppColors.success),
                  _fin('Pending', '₹${fmt.format(rem)}',
                      rem > 0 ? AppColors.warning : AppColors.success),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _showFeeModal(context, s),
                      child: const Text('Receive Fee'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => _showStudentForm(context, s),
                    icon: const Icon(Icons.edit_outlined,
                        color: AppColors.textMuted, size: 18),
                  ),
                  IconButton(
                    onPressed: () => _confirmDelete(context, crm, s),
                    icon: const Icon(Icons.delete_outline,
                        color: AppColors.danger, size: 18),
                  ),
                ],
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _fin(String label, String value, Color color) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textMuted)),
          Text(value,
              style: TextStyle(
                  fontSize: 14, fontWeight: FontWeight.w700, color: color)),
        ],
      );

  Widget _actionBtn(String label, Color color, VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Text(label,
              style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ),
      );

  Widget _iconBtn(IconData icon, Color color, VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 14, color: color),
        ),
      );

  Widget _empty() => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(48),
        decoration: BoxDecoration(
          color: AppColors.glassBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: const Column(
          children: [
            Icon(Icons.menu_book_outlined, size: 48, color: AppColors.textMuted),
            SizedBox(height: 12),
            Text('No students found.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
          ],
        ),
      );

  void _showStudentForm(BuildContext context, Student? existing) {
    showDialog(
      context: context,
      builder: (_) => _StudentFormDialog(existing: existing),
    );
  }

  void _showFeeModal(BuildContext context, Student s) {
    showDialog(
      context: context,
      builder: (_) => _FeeDialog(student: s),
    );
  }

  Future<void> _confirmDelete(
      BuildContext context, CrmProvider crm, Student s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.glassBorder)),
        title: const Text('Delete Student?',
            style: TextStyle(color: AppColors.textLight)),
        content: Text('Permanently delete ${s.name}\'s record?',
            style: const TextStyle(color: AppColors.textMuted)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel',
                  style: TextStyle(color: AppColors.textMuted))),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.danger),
              child: const Text('Delete')),
        ],
      ),
    );
    if (ok == true) crm.deleteStudent(s.id);
  }
}

// ── Student Form Dialog ───────────────────────────────────────────────────────
class _StudentFormDialog extends StatefulWidget {
  final Student? existing;
  const _StudentFormDialog({this.existing});

  @override
  State<_StudentFormDialog> createState() => _StudentFormDialogState();
}

class _StudentFormDialogState extends State<_StudentFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _name, _course, _phone, _location, _fee, _note;
  DateTime? _admissionDate;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?.name ?? '');
    _course = TextEditingController(text: e?.course ?? '');
    _phone = TextEditingController(text: e?.phone ?? '');
    _location = TextEditingController(text: e?.location ?? '');
    _fee = TextEditingController(
        text: e != null ? e.monthlyFee.toStringAsFixed(0) : '');
    _note = TextEditingController(text: e?.contract ?? '');
    if (e?.date.isNotEmpty == true) _admissionDate = DateTime.tryParse(e!.date);
  }

  @override
  void dispose() {
    for (final c in [_name, _course, _phone, _location, _fee, _note]) c.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    if (_admissionDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Select admission date'),
          backgroundColor: AppColors.danger));
      return;
    }
    final crm = Provider.of<CrmProvider>(context, listen: false);
    final dateStr =
        '${_admissionDate!.year}-${_admissionDate!.month.toString().padLeft(2, '0')}-${_admissionDate!.day.toString().padLeft(2, '0')}';
    final student = Student(
      id: widget.existing?.id ?? DateTime.now().millisecondsSinceEpoch,
      name: _name.text.trim(),
      course: _course.text.trim(),
      phone: _phone.text.trim(),
      location: _location.text.trim(),
      date: dateStr,
      monthlyFee: double.tryParse(_fee.text) ?? 0,
      chargedFee: widget.existing?.chargedFee ?? 0,
      contract: _note.text.trim(),
    );
    if (widget.existing != null) {
      crm.updateStudent(student);
    } else {
      crm.addStudent(student);
    }
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF111111),
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.glassBorder)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560, maxHeight: 620),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        widget.existing != null
                            ? 'Edit Student'
                            : 'Add New Student',
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textLight),
                      ),
                      const Spacer(),
                      IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close,
                              color: AppColors.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(children: [
                    Expanded(child: _field('Student Name', _name, required: true)),
                    const SizedBox(width: 12),
                    Expanded(child: _field('Course', _course, required: true)),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: _field('Phone', _phone, required: true)),
                    const SizedBox(width: 12),
                    Expanded(child: _field('City/Branch', _location)),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: _datePicker()),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _field('Monthly Fee (₹)', _fee,
                            isNumber: true, required: true)),
                  ]),
                  const SizedBox(height: 12),
                  _label('Internal Note'),
                  TextFormField(
                    controller: _note,
                    maxLines: 2,
                    style: const TextStyle(color: AppColors.textLight, fontSize: 14),
                    decoration: const InputDecoration(
                        hintText: 'Any specific terms...'),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel')),
                      const SizedBox(width: 12),
                      ElevatedButton(
                          onPressed: _save,
                          child: const Text('Save Student')),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl,
      {bool required = false, bool isNumber = false}) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _label(label),
          TextFormField(
            controller: ctrl,
            keyboardType: isNumber ? TextInputType.number : TextInputType.text,
            style: const TextStyle(color: AppColors.textLight, fontSize: 14),
            decoration: const InputDecoration(),
            validator: required
                ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null
                : null,
          ),
        ],
      );

  Widget _datePicker() {
    final label = _admissionDate != null
        ? '${_admissionDate!.day}/${_admissionDate!.month}/${_admissionDate!.year}'
        : 'Admission Date';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label('Admission Date'),
        GestureDetector(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: _admissionDate ?? DateTime.now(),
              firstDate: DateTime(2020),
              lastDate: DateTime.now().add(const Duration(days: 365)),
              builder: (ctx, child) => Theme(
                data: Theme.of(ctx).copyWith(
                  colorScheme:
                      const ColorScheme.dark(primary: AppColors.primary),
                ),
                child: child!,
              ),
            );
            if (picked != null) setState(() => _admissionDate = picked);
          },
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
                    size: 15, color: AppColors.textMuted),
                const SizedBox(width: 8),
                Text(label,
                    style: TextStyle(
                        color: _admissionDate != null
                            ? AppColors.textLight
                            : AppColors.textMuted,
                        fontSize: 14)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text,
            style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w500)),
      );
}

// ── Fee Dialog ────────────────────────────────────────────────────────────────
class _FeeDialog extends StatefulWidget {
  final Student student;
  const _FeeDialog({required this.student});

  @override
  State<_FeeDialog> createState() => _FeeDialogState();
}

class _FeeDialogState extends State<_FeeDialog> {
  late TextEditingController _base, _charged, _remaining, _note;

  @override
  void initState() {
    super.initState();
    _base = TextEditingController(
        text: widget.student.monthlyFee.toStringAsFixed(0));
    _charged = TextEditingController(
        text: widget.student.chargedFee.toStringAsFixed(0));
    _remaining = TextEditingController();
    _note = TextEditingController(text: widget.student.feeNote);
    _calc();
  }

  @override
  void dispose() {
    _base.dispose();
    _charged.dispose();
    _remaining.dispose();
    _note.dispose();
    super.dispose();
  }

  void _calc() {
    final b = double.tryParse(_base.text) ?? 0;
    final c = double.tryParse(_charged.text) ?? 0;
    setState(() => _remaining.text = (b - c).toStringAsFixed(0));
  }

  void _save() {
    final crm = Provider.of<CrmProvider>(context, listen: false);
    crm.updateStudentFee(
      widget.student.id,
      double.tryParse(_base.text) ?? 0,
      double.tryParse(_charged.text) ?? 0,
      _note.text.trim(),
    );
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Fee for ${widget.student.name} updated.'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF111111),
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.glassBorder)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text('Student Fee Receipt',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textLight)),
                  const Spacer(),
                  IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close,
                          color: AppColors.textMuted)),
                ],
              ),
              const SizedBox(height: 16),
              _readOnly('Student Name', widget.student.name),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _numField('Expected Fee (₹)', _base)),
                  const SizedBox(width: 12),
                  Expanded(
                      child: _numField('Amount Received (₹)', _charged)),
                ],
              ),
              const SizedBox(height: 12),
              _readOnlyCtrl('Balance Pending (₹)', _remaining,
                  color: AppColors.warning),
              const SizedBox(height: 12),
              _textField('Payment Mode / Note', _note,
                  hint: 'e.g. Cash / GPay - April'),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel')),
                  const SizedBox(width: 12),
                  ElevatedButton(
                      onPressed: _save,
                      child: const Text('Receive Fee')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _readOnly(String label, String value) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _lbl(label),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0x05FFFFFF),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Text(value,
                style: const TextStyle(
                    color: AppColors.textLight, fontSize: 14)),
          ),
        ],
      );

  Widget _readOnlyCtrl(String label, TextEditingController ctrl,
      {Color color = AppColors.textMuted}) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _lbl(label),
          TextFormField(
            controller: ctrl,
            readOnly: true,
            style: TextStyle(color: color, fontSize: 14),
            decoration: const InputDecoration(),
          ),
        ],
      );

  Widget _numField(String label, TextEditingController ctrl) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _lbl(label),
          TextFormField(
            controller: ctrl,
            keyboardType: TextInputType.number,
            onChanged: (_) => _calc(),
            style: const TextStyle(color: AppColors.textLight, fontSize: 14),
            decoration: const InputDecoration(hintText: '0'),
          ),
        ],
      );

  Widget _textField(String label, TextEditingController ctrl,
      {String? hint}) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _lbl(label),
          TextFormField(
            controller: ctrl,
            style: const TextStyle(color: AppColors.textLight, fontSize: 14),
            decoration: InputDecoration(hintText: hint),
          ),
        ],
      );

  Widget _lbl(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text,
            style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w500)),
      );
}
