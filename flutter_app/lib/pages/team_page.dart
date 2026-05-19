import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';

class TeamPage extends StatelessWidget {
  const TeamPage({super.key});

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context);

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
                  Text('Team Directory',
                      style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textLight)),
                  SizedBox(height: 4),
                  Text('Insert, update, and remove Team members.',
                      style:
                          TextStyle(color: AppColors.textMuted, fontSize: 13)),
                ],
              ),
            ),
            ElevatedButton.icon(
              onPressed: () => _showTeamForm(context, null),
              icon: const Icon(Icons.person_add_outlined, size: 18),
              label: const Text('Add Team'),
            ),
          ],
        ),
        const SizedBox(height: 24),

        if (crm.teamMembers.isEmpty)
          _empty()
        else
          ...crm.teamMembers.map((m) => _TeamMemberTile(
                member: m,
                onEdit: () => _showTeamForm(context, m),
                onDelete: () => _confirmDelete(context, crm, m),
              )),
      ],
    );
  }

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
            Icon(Icons.group_outlined, size: 48, color: AppColors.textMuted),
            SizedBox(height: 12),
            Text('No team members added yet.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
          ],
        ),
      );

  void _showTeamForm(BuildContext context, TeamMember? existing) {
    showDialog(
      context: context,
      builder: (_) => _TeamFormDialog(existing: existing),
    );
  }

  Future<void> _confirmDelete(
      BuildContext context, CrmProvider crm, TeamMember m) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.glassBorder)),
        title: const Text('Remove Member?',
            style: TextStyle(color: AppColors.textLight)),
        content: Text('Remove ${m.name} from the team?',
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
              child: const Text('Remove')),
        ],
      ),
    );
    if (ok == true) crm.deleteTeamMember(m.id);
  }
}

class _TeamMemberTile extends StatelessWidget {
  final TeamMember member;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _TeamMemberTile({
    required this.member,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isManager = member.role == 'Manager';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.glassBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isManager
                  ? AppColors.primary.withOpacity(0.15)
                  : AppColors.success.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isManager ? Icons.work_outline : Icons.brush,
              color: isManager ? AppColors.primary : AppColors.success,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.name,
                  style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textLight),
                ),
                const SizedBox(height: 3),
                Text(
                  member.phone.isNotEmpty ? member.phone : '-',
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textMuted),
                ),
              ],
            ),
          ),

          // Role badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isManager
                  ? AppColors.primary.withOpacity(0.1)
                  : AppColors.success.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isManager
                    ? AppColors.primary.withOpacity(0.3)
                    : AppColors.success.withOpacity(0.3),
              ),
            ),
            child: Text(
              member.role,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isManager ? AppColors.primary : AppColors.success,
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Location
          if (member.location.isNotEmpty)
            Text(member.location,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(width: 16),

          // Actions
          IconButton(
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined,
                color: AppColors.textMuted, size: 18),
            tooltip: 'Edit',
          ),
          IconButton(
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline,
                color: AppColors.danger, size: 18),
            tooltip: 'Remove',
          ),
        ],
      ),
    );
  }
}

class _TeamFormDialog extends StatefulWidget {
  final TeamMember? existing;
  const _TeamFormDialog({this.existing});

  @override
  State<_TeamFormDialog> createState() => _TeamFormDialogState();
}

class _TeamFormDialogState extends State<_TeamFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _name, _phone, _location;
  String _role = 'Team';

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.existing?.name ?? '');
    _phone = TextEditingController(text: widget.existing?.phone ?? '');
    _location = TextEditingController(text: widget.existing?.location ?? '');
    _role = widget.existing?.role ?? 'Team';
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _location.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    final crm = Provider.of<CrmProvider>(context, listen: false);

    if (widget.existing != null) {
      crm.updateTeamMember(widget.existing!.copyWith(
        name: _name.text.trim(),
        role: _role,
        phone: _phone.text.trim(),
        location: _location.text.trim(),
      ));
    } else {
      crm.addTeamMember(TeamMember(
        id: DateTime.now().millisecondsSinceEpoch,
        name: _name.text.trim(),
        role: _role,
        phone: _phone.text.trim(),
        location: _location.text.trim(),
      ));
    }
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.existing != null;
    return Dialog(
      backgroundColor: const Color(0xFF111111),
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.glassBorder)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      isEdit ? 'Edit Team Member' : 'Add Team Member',
                      style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textLight),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close, color: AppColors.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _label('Full Name'),
                TextFormField(
                  controller: _name,
                  style: const TextStyle(color: AppColors.textLight),
                  decoration: const InputDecoration(hintText: 'e.g. Rahul Kumar'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('Role'),
                          DropdownButtonFormField<String>(
                            value: _role,
                            dropdownColor: const Color(0xFF1A1A1A),
                            style: const TextStyle(
                                color: AppColors.textLight, fontSize: 14),
                            decoration: const InputDecoration(),
                            items: ['Team', 'Manager']
                                .map((r) =>
                                    DropdownMenuItem(value: r, child: Text(r)))
                                .toList(),
                            onChanged: (v) => setState(() => _role = v!),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('City/Location'),
                          TextFormField(
                            controller: _location,
                            style: const TextStyle(color: AppColors.textLight),
                            decoration:
                                const InputDecoration(hintText: 'e.g. Surat'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _label('Phone Number'),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: AppColors.textLight),
                  decoration:
                      const InputDecoration(hintText: 'e.g. 9876543210'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: _save,
                      child: const Text('Save Member'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
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
