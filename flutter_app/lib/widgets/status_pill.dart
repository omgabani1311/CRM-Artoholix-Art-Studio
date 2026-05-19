import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class StatusPill extends StatelessWidget {
  final String status;

  const StatusPill({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Color border;

    switch (status) {
      case 'Completed':
        bg = AppColors.success.withOpacity(0.15);
        fg = AppColors.success;
        border = AppColors.success.withOpacity(0.3);
        break;
      case 'In Progress':
        bg = AppColors.info.withOpacity(0.15);
        fg = AppColors.info;
        border = AppColors.info.withOpacity(0.3);
        break;
      case 'Confirmation Pending':
        bg = AppColors.warning.withOpacity(0.15);
        fg = AppColors.warning;
        border = AppColors.warning.withOpacity(0.3);
        break;
      default: // Pending
        bg = AppColors.warning.withOpacity(0.15);
        fg = AppColors.warning;
        border = AppColors.warning.withOpacity(0.3);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }
}
