import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/stat_card.dart';

class AnalyticsPage extends StatelessWidget {
  const AnalyticsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context);
    final fmt = NumberFormat('#,##,##0', 'en_IN');
    final show = crm.canViewAmounts;

    String _fmt(double v) => show ? '₹${fmt.format(v)}' : '--';

    final upcoming = crm.totalRevenue - crm.totalReceived;

    // Style breakdown
    final styleMap = <String, int>{};
    for (final f in crm.followUps) {
      if (f.style.isNotEmpty) {
        styleMap[f.style] = (styleMap[f.style] ?? 0) + 1;
      }
    }
    final sortedStyles = styleMap.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    // Status breakdown
    final pending = crm.followUps.where((f) => f.status == 'Pending').length;
    final inProgress =
        crm.followUps.where((f) => f.status == 'In Progress').length;
    final completed =
        crm.followUps.where((f) => f.status == 'Completed').length;
    final total = crm.followUps.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Studio Analytics',
            style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: AppColors.textLight)),
        const SizedBox(height: 4),
        const Text('Project based performance overview.',
            style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
        const SizedBox(height: 24),

        // Finance stat cards
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              FinanceStatCard(
                title: 'Total Revenue',
                value: _fmt(crm.totalRevenue),
                subtitle: 'Based on all active projects',
              ),
              const SizedBox(width: 16),
              FinanceStatCard(
                title: 'Monthly Revenue',
                value: _fmt(crm.monthlyRevenue),
                subtitle: "This month's received payments",
              ),
              const SizedBox(width: 16),
              FinanceStatCard(
                title: 'Payment Received',
                value: _fmt(crm.totalReceived),
                subtitle: 'Advance + Clear Payments',
                valueColor: AppColors.success,
              ),
              const SizedBox(width: 16),
              FinanceStatCard(
                title: 'Upcoming Amount',
                value: _fmt(upcoming.abs()),
                subtitle: 'Remaining pending amount',
                valueColor: AppColors.warning,
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),

        // Project status breakdown
        _SectionHeader(title: 'Project Status Breakdown'),
        const SizedBox(height: 16),
        if (total > 0)
          _StatusBreakdown(
            pending: pending,
            inProgress: inProgress,
            completed: completed,
            total: total,
          )
        else
          _noData(),

        const SizedBox(height: 32),

        // Art style breakdown
        _SectionHeader(title: 'Art Style Popularity'),
        const SizedBox(height: 16),
        if (sortedStyles.isEmpty)
          _noData()
        else
          ...sortedStyles.map((e) => _StyleBar(
                style: e.key,
                count: e.value,
                maxCount: sortedStyles.first.value,
              )),
      ],
    );
  }

  Widget _noData() => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: AppColors.glassBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: const Text('No data available yet.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted)),
      );
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) => Text(
        title,
        style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textLight),
      );
}

class _StatusBreakdown extends StatelessWidget {
  final int pending, inProgress, completed, total;
  const _StatusBreakdown({
    required this.pending,
    required this.inProgress,
    required this.completed,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.glassBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          Row(
            children: [
              _statItem('Pending', pending, AppColors.warning),
              const SizedBox(width: 16),
              _statItem('In Progress', inProgress, AppColors.info),
              const SizedBox(width: 16),
              _statItem('Completed', completed, AppColors.success),
            ],
          ),
          const SizedBox(height: 16),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Row(
              children: [
                if (pending > 0)
                  Flexible(
                    flex: pending,
                    child: Container(height: 8, color: AppColors.warning),
                  ),
                if (inProgress > 0)
                  Flexible(
                    flex: inProgress,
                    child: Container(height: 8, color: AppColors.info),
                  ),
                if (completed > 0)
                  Flexible(
                    flex: completed,
                    child: Container(height: 8, color: AppColors.success),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Total: $total projects',
            style: const TextStyle(
                fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _statItem(String label, int count, Color color) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$count',
              style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: color)),
          Text(label,
              style: const TextStyle(
                  fontSize: 12, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}

class _StyleBar extends StatelessWidget {
  final String style;
  final int count;
  final int maxCount;

  const _StyleBar({
    required this.style,
    required this.count,
    required this.maxCount,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.glassBg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 130,
              child: Text(style,
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textLight)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: maxCount > 0 ? count / maxCount : 0,
                  backgroundColor: Colors.white.withOpacity(0.05),
                  valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                  minHeight: 8,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text('$count',
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary)),
          ],
        ),
      ),
    );
  }
}
