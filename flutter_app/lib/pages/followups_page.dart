import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/status_pill.dart';
import '../widgets/follow_up_form.dart';

class FollowUpsPage extends StatelessWidget {
  const FollowUpsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('All Follow-ups',
                      style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textLight)),
                  SizedBox(height: 4),
                  Text('Manage all tasks and artworks here.',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                ],
              ),
            ),
            const SizedBox(width: 16),
            // Tab switcher
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child: Row(
                children: [
                  _TabBtn(
                    label: 'Active',
                    active: crm.followUpTab == 'Active',
                    onTap: () => crm.setFollowUpTab('Active'),
                  ),
                  const SizedBox(width: 4),
                  _TabBtn(
                    label: 'Completed',
                    active: crm.followUpTab == 'Completed',
                    onTap: () => crm.setFollowUpTab('Completed'),
                  ),
                ],
              ),
            ),
            if (crm.isOwner || crm.isManager) ...[
              const SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: () => showDialog(
                  context: context,
                  builder: (_) => const FollowUpFormDialog(),
                ),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add New'),
              ),
            ],
          ],
        ),
        const SizedBox(height: 20),

        // Data table
        _FollowUpsTable(crm: crm),
      ],
    );
  }
}

class _TabBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _TabBtn({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: active ? Colors.white : AppColors.textMuted,
          ),
        ),
      ),
    );
  }
}

class _FollowUpsTable extends StatelessWidget {
  final CrmProvider crm;

  const _FollowUpsTable({required this.crm});

  List<FollowUp> _filteredData() {
    List<FollowUp> data = crm.getRelevantFollowUps();
    if (crm.followUpTab == 'Active') {
      data = data.where((f) => f.status != 'Completed').toList();
      data.sort((a, b) {
        final da = DateTime.tryParse(a.date) ?? DateTime(2099);
        final db = DateTime.tryParse(b.date) ?? DateTime(2099);
        return da.compareTo(db);
      });
    } else {
      data = data.where((f) => f.status == 'Completed').toList();
      data.sort((a, b) {
        final da = DateTime.tryParse(a.completedAt ?? a.date) ?? DateTime(2000);
        final db = DateTime.tryParse(b.completedAt ?? b.date) ?? DateTime(2000);
        return db.compareTo(da);
      });
    }
    return data;
  }

  Color _urgencyColor(FollowUp item) {
    if (item.status == 'Completed' || item.date.isEmpty) return Colors.transparent;
    final deadline = DateTime.tryParse(item.date);
    if (deadline == null) return Colors.transparent;
    final diff = deadline.difference(DateTime.now()).inDays;
    if (diff <= 10) return const Color(0xFFFF7A00);
    if (diff <= 15) return const Color(0xFFFACC15);
    return Colors.transparent;
  }

  @override
  Widget build(BuildContext context) {
    final data = _filteredData();
    final fmt = NumberFormat('#,##,##0', 'en_IN');

    if (data.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(48),
        decoration: BoxDecoration(
          color: AppColors.glassBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: const Column(
          children: [
            Icon(Icons.checklist, size: 48, color: AppColors.textMuted),
            SizedBox(height: 12),
            Text('No follow-ups found.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
          ],
        ),
      );
    }

    // Mobile: card list
    final isWide = MediaQuery.of(context).size.width > 800;
    if (!isWide) return _mobileList(context, data, fmt);

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
          dataRowColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.hovered)) {
              return Colors.white.withOpacity(0.05);
            }
            return Colors.transparent;
          }),
          columnSpacing: 16,
          headingTextStyle: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: AppColors.textMuted,
            letterSpacing: 0.5,
          ),
          dataTextStyle: const TextStyle(
            fontSize: 13,
            color: AppColors.textLight,
          ),
          columns: [
            const DataColumn(label: Text('NO.')),
            const DataColumn(label: Text('CLIENT')),
            const DataColumn(label: Text('CONTACT')),
            const DataColumn(label: Text('CITY, STATE')),
            const DataColumn(label: Text('ART STYLE')),
            const DataColumn(label: Text('SIZE')),
            if (crm.canViewAmounts) ...[
              const DataColumn(label: Text('TOTAL (₹)')),
              const DataColumn(label: Text('ADVANCE (₹)')),
              const DataColumn(label: Text('REMAINING (₹)')),
            ],
            const DataColumn(label: Text('DEADLINE')),
            const DataColumn(label: Text('STATUS')),
            const DataColumn(label: Text('STAGE')),
            const DataColumn(label: Text('ASSIGNEE')),
            const DataColumn(label: Text('ACTIONS')),
          ],
          rows: data.asMap().entries.map((entry) {
            final i = entry.key;
            final item = entry.value;
            final urgency = _urgencyColor(item);
            final assignedRole = item.assign.contains(':')
                ? item.assign.split(':')[0].trim()
                : item.assign;
            final canMarkDone = (crm.isManager || crm.isTeam) &&
                item.status != 'Completed' &&
                assignedRole == crm.currentRole;

            return DataRow(
              cells: [
                DataCell(Text('${i + 1}',
                    style: TextStyle(
                        color: urgency != Colors.transparent
                            ? urgency
                            : AppColors.textMuted,
                        fontWeight: FontWeight.w700))),
                DataCell(
                  Text(item.client,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  onTap: (crm.isOwner || crm.isManager)
                      ? () => showDialog(
                            context: context,
                            builder: (_) => FollowUpFormDialog(existing: item),
                          )
                      : null,
                ),
                DataCell(Text(item.contact.isNotEmpty ? item.contact : '-')),
                DataCell(Text(item.location.isNotEmpty
                    ? (item.state.isNotEmpty
                        ? '${item.location}, ${item.state}'
                        : item.location)
                    : '-')),
                DataCell(Text(item.style.isNotEmpty ? item.style : '-')),
                DataCell(Text(item.size.isNotEmpty ? item.size : '-')),
                if (crm.canViewAmounts) ...[
                  DataCell(Text('₹${fmt.format(item.total)}',
                      style: const TextStyle(color: AppColors.primary))),
                  DataCell(Text('₹${fmt.format(item.advance)}',
                      style: const TextStyle(color: AppColors.success))),
                  DataCell(Text('₹${fmt.format(item.remaining)}',
                      style: const TextStyle(color: AppColors.danger))),
                ],
                DataCell(Text(item.date)),
                DataCell(StatusPill(status: item.status)),
                DataCell(Text(item.stage.isNotEmpty ? item.stage : '-',
                    style: const TextStyle(color: AppColors.textMuted))),
                DataCell(Row(
                  children: [
                    const Icon(Icons.person_pin_outlined,
                        size: 13, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text(item.assign,
                        style: const TextStyle(color: AppColors.textMuted)),
                  ],
                )),
                DataCell(
                  Row(
                    children: [
                      if (crm.isOwner) ...[
                        _actionBtn(
                          Icons.edit_outlined,
                          AppColors.primary,
                          () => showDialog(
                            context: context,
                            builder: (_) => FollowUpFormDialog(existing: item),
                          ),
                        ),
                        const SizedBox(width: 4),
                        _actionBtn(
                          Icons.delete_outline,
                          AppColors.danger,
                          () => _confirmDelete(context, crm, item),
                        ),
                      ],
                      if (canMarkDone) ...[
                        GestureDetector(
                          onTap: () => _confirmComplete(context, crm, item),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.success,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('✓ Done',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.black,
                                    fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _mobileList(BuildContext context, List<FollowUp> data, NumberFormat fmt) {
    return Column(
      children: data.asMap().entries.map((e) {
        final item = e.value;
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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(item.client,
                        style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textLight)),
                  ),
                  StatusPill(status: item.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(item.desc,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 13)),
              const SizedBox(height: 8),
              Row(
                children: [
                  _chip(Icons.brush, item.style),
                  const SizedBox(width: 8),
                  _chip(Icons.schedule, item.date),
                ],
              ),
              if (crm.canViewAmounts) ...[
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('₹${fmt.format(item.total)}',
                        style: const TextStyle(
                            color: AppColors.primary, fontWeight: FontWeight.w600)),
                    Text('Rem: ₹${fmt.format(item.remaining)}',
                        style: const TextStyle(
                            color: AppColors.danger, fontWeight: FontWeight.w600)),
                  ],
                ),
              ],
              if (crm.isOwner || crm.isManager) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => showDialog(
                        context: context,
                        builder: (_) => FollowUpFormDialog(existing: item),
                      ),
                      icon: const Icon(Icons.edit_outlined, size: 14),
                      label: const Text('Edit', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                      ),
                    ),
                    if (crm.isOwner) ...[
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () => _confirmDelete(context, crm, item),
                        icon: const Icon(Icons.delete_outline,
                            size: 14, color: AppColors.danger),
                        label: const Text('Delete',
                            style: TextStyle(
                                fontSize: 12, color: AppColors.danger)),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          side: const BorderSide(color: AppColors.danger),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _chip(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: AppColors.textMuted),
        const SizedBox(width: 4),
        Text(text,
            style: const TextStyle(
                fontSize: 11, color: AppColors.textMuted)),
      ],
    );
  }

  Widget _actionBtn(IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
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
  }

  Future<void> _confirmDelete(
      BuildContext context, CrmProvider crm, FollowUp item) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.glassBorder),
        ),
        title: const Row(
          children: [
            Icon(Icons.delete_outline, color: AppColors.danger),
            SizedBox(width: 8),
            Text('Delete Follow-up?',
                style: TextStyle(color: AppColors.textLight)),
          ],
        ),
        content: Text(
          'Are you sure you want to delete the follow-up for ${item.client}?',
          style: const TextStyle(color: AppColors.textMuted),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel',
                  style: TextStyle(color: AppColors.textMuted))),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Yes, Delete'),
          ),
        ],
      ),
    );
    if (ok == true) crm.deleteFollowUp(item.id);
  }

  Future<void> _confirmComplete(
      BuildContext context, CrmProvider crm, FollowUp item) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: const Text('Confirm Completion',
            style: TextStyle(color: AppColors.textLight)),
        content: Text('Mark ${item.client}\'s project as Completed?',
            style: const TextStyle(color: AppColors.textMuted)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Complete')),
        ],
      ),
    );
    if (ok == true) crm.markCompleted(item.id);
  }
}
