import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import 'status_pill.dart';

class FollowUpCard extends StatelessWidget {
  final FollowUp item;
  final bool canEdit;
  final bool showAmounts;
  final bool showCompleteButton;
  final VoidCallback? onTap;
  final VoidCallback? onMarkComplete;
  final int index;

  const FollowUpCard({
    super.key,
    required this.item,
    this.canEdit = false,
    this.showAmounts = false,
    this.showCompleteButton = false,
    this.onTap,
    this.onMarkComplete,
    this.index = 0,
  });

  Color _urgencyColor() {
    if (item.status == 'Completed') return Colors.transparent;
    if (item.date.isEmpty) return Colors.transparent;
    final deadline = DateTime.tryParse(item.date);
    if (deadline == null) return Colors.transparent;
    final diff = deadline.difference(DateTime.now()).inDays;
    if (diff <= 10) return const Color(0xFFFF7A00);
    if (diff <= 15) return const Color(0xFFFACC15);
    return Colors.transparent;
  }

  @override
  Widget build(BuildContext context) {
    final urgency = _urgencyColor();
    final fmt = NumberFormat('#,##,##0', 'en_IN');

    return GestureDetector(
      onTap: canEdit ? onTap : null,
      child: Container(
        width: 230,
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: AppColors.glassBg,
          borderRadius: BorderRadius.circular(12),
          border: Border(
            left: BorderSide(
              color: urgency != Colors.transparent ? urgency : AppColors.glassBorder,
              width: urgency != Colors.transparent ? 4 : 1,
            ),
            top: const BorderSide(color: AppColors.glassBorder),
            right: const BorderSide(color: AppColors.glassBorder),
            bottom: const BorderSide(color: AppColors.glassBorder),
          ),
        ),
        child: Stack(
          children: [
            // Top urgency bar
            if (urgency != Colors.transparent)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: urgency,
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(12),
                    ),
                  ),
                ),
              ),
            // Badge number
            if (canEdit)
              Positioned(
                top: 10,
                left: 10,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '${index + 1}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.black,
                      ),
                    ),
                  ),
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (canEdit) const SizedBox(height: 24),
                  Text(
                    item.style.isNotEmpty ? item.style.toUpperCase() : 'ARTWORK',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.desc.isNotEmpty ? item.desc : 'No description',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textLight,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 10),
                  _row(Icons.person_outline, item.client, AppColors.textMuted),
                  const SizedBox(height: 3),
                  _row(Icons.phone_outlined, item.contact.isNotEmpty ? item.contact : '-', AppColors.textMuted, fontSize: 11),
                  const SizedBox(height: 10),

                  if (showAmounts) ...[
                    _amountRow('Total', '₹${fmt.format(item.total)}', AppColors.primary),
                    _amountRow('Advance', '₹${fmt.format(item.advance)}', AppColors.success),
                    _amountRow('Remaining', '₹${fmt.format(item.remaining)}', AppColors.danger, bold: true),
                    const Divider(color: AppColors.glassBorder, height: 16),
                  ],

                  _row(Icons.work_outline, item.stage.isNotEmpty ? item.stage : 'No stage', AppColors.textMuted, fontSize: 11),
                  const SizedBox(height: 3),
                  _row(Icons.schedule_outlined, 'Due: ${item.date}', AppColors.textMuted, fontSize: 11),

                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      StatusPill(status: item.status),
                      if (showCompleteButton)
                        GestureDetector(
                          onTap: onMarkComplete,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.success,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              '✓ Done',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.black,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String text, Color color,
      {double fontSize = 12}) {
    return Row(
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: fontSize, color: color),
          ),
        ),
      ],
    );
  }

  Widget _amountRow(String label, String value, Color valueColor,
      {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textMuted)),
          Text(
            value,
            style: TextStyle(
              fontSize: bold ? 12 : 11,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}
