import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/stat_card.dart';
import '../widgets/follow_up_card.dart';
import '../widgets/follow_up_form.dart';

class DashboardPage extends StatelessWidget {
  final void Function(String) onNavigate;

  const DashboardPage({super.key, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context);
    final relevant = crm.getRelevantFollowUps();

    // Filter for dashboard view
    List followUps = relevant;
    if (crm.dashboardFilter != 'All') {
      followUps = relevant.where((f) => f.status == crm.dashboardFilter).toList();
    }
    followUps.sort((a, b) {
      if (a.status == 'Completed' && b.status != 'Completed') return 1;
      if (a.status != 'Completed' && b.status == 'Completed') return -1;
      final da = DateTime.tryParse(a.date) ?? DateTime(2099);
      final db = DateTime.tryParse(b.date) ?? DateTime(2099);
      return da.compareTo(db);
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header row
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            if (crm.isOwner)
              ElevatedButton.icon(
                onPressed: () => showDialog(
                  context: context,
                  builder: (_) => const FollowUpFormDialog(),
                ),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New Follow-up'),
              ),
          ],
        ),
        const SizedBox(height: 20),

        // Stats row
        _StatsRow(crm: crm),
        const SizedBox(height: 28),

        // Recent follow-ups header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Follow-ups',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textLight,
              ),
            ),
            GestureDetector(
              onTap: () => onNavigate('followups'),
              child: const Text(
                'View All',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Horizontal scroll cards
        if (followUps.isEmpty)
          _EmptyState(filter: crm.dashboardFilter)
        else
          SizedBox(
            height: 360,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: followUps.length,
              itemBuilder: (ctx, i) {
                final item = followUps[i];
                final assignedRole =
                    item.assign.contains(':')
                        ? item.assign.split(':')[0].trim()
                        : item.assign;
                final showComplete = (crm.isManager || crm.isTeam) &&
                    item.status != 'Completed' &&
                    assignedRole == crm.currentRole;

                return FollowUpCard(
                  item: item,
                  index: i,
                  canEdit: crm.isOwner || crm.isManager,
                  showAmounts: crm.canViewAmounts,
                  showCompleteButton: showComplete,
                  onTap: () => showDialog(
                    context: ctx,
                    builder: (_) => FollowUpFormDialog(existing: item),
                  ),
                  onMarkComplete: () =>
                      _confirmComplete(ctx, crm, item.id, item.client),
                );
              },
            ),
          ),
      ],
    );
  }

  Future<void> _confirmComplete(
      BuildContext context, CrmProvider crm, int id, String client) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.glassBorder),
        ),
        title: const Text('Confirm Completion',
            style: TextStyle(color: AppColors.textLight)),
        content: Text(
          'Mark project for $client as Completed?',
          style: const TextStyle(color: AppColors.textMuted),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel',
                  style: TextStyle(color: AppColors.textMuted))),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Yes, Complete')),
        ],
      ),
    );
    if (ok == true) crm.markCompleted(id);
  }
}

class _StatsRow extends StatelessWidget {
  final CrmProvider crm;

  const _StatsRow({required this.crm});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          StatCard(
            title: 'Total Tasks',
            value: crm.totalTasks.toString(),
            icon: Icons.list_alt_outlined,
            onTap: () => crm.setDashboardFilter('All'),
          ),
          const SizedBox(width: 16),
          StatCard(
            title: 'Pending',
            value: crm.pendingTasks.toString(),
            icon: Icons.access_time_outlined,
            iconColor: AppColors.warning,
            iconBg: Color(0x1AF59E0B),
            onTap: () => crm.setDashboardFilter('Pending'),
          ),
          const SizedBox(width: 16),
          StatCard(
            title: 'Completed',
            value: crm.completedTasks.toString(),
            icon: Icons.check_circle_outline,
            iconColor: AppColors.success,
            iconBg: Color(0x1A10B981),
            onTap: () => crm.setDashboardFilter('Completed'),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String filter;
  const _EmptyState({required this.filter});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: AppColors.glassBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          const Icon(Icons.inbox_outlined,
              size: 48, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(
            filter == 'All'
                ? 'No follow-ups yet.'
                : 'No $filter follow-ups.',
            style: const TextStyle(
                color: AppColors.textMuted, fontSize: 15),
          ),
        ],
      ),
    );
  }
}
