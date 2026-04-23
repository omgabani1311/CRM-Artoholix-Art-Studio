import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';

class ClientsPage extends StatelessWidget {
  const ClientsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context);
    final fmt = NumberFormat('#,##,##0', 'en_IN');

    // Build metrics map
    final metricsMap = <String, Map<String, dynamic>>{};
    for (final f in crm.followUps) {
      final key = f.client.toLowerCase().trim();
      metricsMap[key] ??= {'projects': 0, 'revenue': 0.0};
      metricsMap[key]!['projects'] = (metricsMap[key]!['projects'] as int) + 1;
      metricsMap[key]!['revenue'] =
          (metricsMap[key]!['revenue'] as double) + f.total;
    }

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
                  Text('Client Directory',
                      style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textLight)),
                  SizedBox(height: 4),
                  Text('Manage all studio clients and their details.',
                      style:
                          TextStyle(color: AppColors.textMuted, fontSize: 13)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.success.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.sync, color: AppColors.success, size: 16),
                  SizedBox(width: 6),
                  Text('Auto Synced',
                      style: TextStyle(
                          color: AppColors.success,
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        if (crm.clients.isEmpty)
          _empty()
        else if (isWide)
          _desktopTable(context, crm, metricsMap, fmt)
        else
          _mobileList(context, crm, metricsMap, fmt),
      ],
    );
  }

  Widget _desktopTable(BuildContext context, CrmProvider crm,
      Map metricsMap, NumberFormat fmt) {
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
          dataTextStyle: const TextStyle(fontSize: 13, color: AppColors.textLight),
          columnSpacing: 20,
          columns: const [
            DataColumn(label: Text('CLIENT NAME')),
            DataColumn(label: Text('PRIMARY PHONE')),
            DataColumn(label: Text('CITY, STATE')),
            DataColumn(label: Text('TOTAL PROJECTS')),
            DataColumn(label: Text('GROSS REVENUE (₹)')),
            DataColumn(label: Text('ACTION')),
          ],
          rows: crm.clients.map((c) {
            final key = c.name.toLowerCase().trim();
            final projs = (metricsMap[key]?['projects'] as int?) ?? 0;
            final rev = (metricsMap[key]?['revenue'] as double?) ?? 0.0;
            return DataRow(
              cells: [
                DataCell(Text(c.name,
                    style: const TextStyle(fontWeight: FontWeight.w600))),
                DataCell(Text(c.contact)),
                DataCell(Text(c.location)),
                DataCell(Text('$projs',
                    style: const TextStyle(
                        color: AppColors.primary, fontWeight: FontWeight.w600))),
                DataCell(crm.canViewAmounts
                    ? Text('₹${fmt.format(rev)}',
                        style: const TextStyle(
                            color: AppColors.success,
                            fontWeight: FontWeight.w600))
                    : const Text('--',
                        style: TextStyle(color: AppColors.textMuted))),
                DataCell(Row(
                  children: [
                    if (crm.isOwner)
                      IconButton(
                        onPressed: () => _confirmDelete(context, crm, c),
                        icon: const Icon(Icons.delete_outline,
                            color: AppColors.danger, size: 18),
                        tooltip: 'Delete',
                      ),
                  ],
                )),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _mobileList(BuildContext context, CrmProvider crm,
      Map metricsMap, NumberFormat fmt) {
    return Column(
      children: crm.clients.map((c) {
        final key = c.name.toLowerCase().trim();
        final projs = (metricsMap[key]?['projects'] as int?) ?? 0;
        final rev = (metricsMap[key]?['revenue'] as double?) ?? 0.0;
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.glassBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: Color(0x1AD4AF37),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.person_outline,
                    color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.name,
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textLight)),
                    Text(c.contact,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textMuted)),
                    Text(c.location,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textMuted)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('$projs projects',
                      style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600)),
                  if (crm.canViewAmounts)
                    Text('₹${fmt.format(rev)}',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.success)),
                ],
              ),
              if (crm.isOwner) ...[
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _confirmDelete(context, crm, c),
                  icon: const Icon(Icons.delete_outline,
                      color: AppColors.danger, size: 18),
                ),
              ],
            ],
          ),
        );
      }).toList(),
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
            Text('No clients yet. Clients are auto-synced from Follow-ups.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 14),
                textAlign: TextAlign.center),
          ],
        ),
      );

  Future<void> _confirmDelete(
      BuildContext context, CrmProvider crm, Client c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.glassBorder)),
        title: const Text('Delete Client?',
            style: TextStyle(color: AppColors.textLight)),
        content: Text('Remove ${c.name} from the client directory?',
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
    if (ok == true) crm.deleteClient(c.id);
  }
}
