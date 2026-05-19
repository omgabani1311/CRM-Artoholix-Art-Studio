import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/stat_card.dart';

class EmployeesPage extends StatelessWidget {
  const EmployeesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context);
    final fmt = NumberFormat('#,##,##0', 'en_IN');

    double totalBase = 0;
    double totalPaid = 0;
    for (final m in crm.teamMembers) {
      totalBase += m.baseSalary;
      totalPaid += m.paidSalary;
    }
    final pending = totalBase - totalPaid;

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
                  Text('Employees Dashboard',
                      style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textLight)),
                  SizedBox(height: 4),
                  Text('Manage staff salary and payment records.',
                      style: TextStyle(
                          color: AppColors.textMuted, fontSize: 13)),
                ],
              ),
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
                  title: 'Total Base Salary',
                  value: '₹ ${fmt.format(totalBase)}'),
              const SizedBox(width: 16),
              FinanceStatCard(
                  title: 'Total Paid',
                  value: '₹ ${fmt.format(totalPaid)}',
                  valueColor: AppColors.success),
              const SizedBox(width: 16),
              FinanceStatCard(
                  title: 'Pending Salary',
                  value: '₹ ${fmt.format(pending)}',
                  valueColor: AppColors.warning),
            ],
          ),
        ),
        const SizedBox(height: 24),

        if (crm.teamMembers.isEmpty)
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
          columnSpacing: 20,
          columns: const [
            DataColumn(label: Text('EMPLOYEE NAME')),
            DataColumn(label: Text('ROLE')),
            DataColumn(label: Text('PHONE')),
            DataColumn(label: Text('BASE SALARY (₹)')),
            DataColumn(label: Text('PAID (₹)')),
            DataColumn(label: Text('REMAINING (₹)')),
            DataColumn(label: Text('NOTE')),
            DataColumn(label: Text('ACTIONS')),
          ],
          rows: crm.teamMembers.map((m) {
            final rem = m.baseSalary - m.paidSalary;
            return DataRow(cells: [
              DataCell(Text(m.name,
                  style: const TextStyle(fontWeight: FontWeight.w600))),
              DataCell(Text(m.role,
                  style: TextStyle(
                      color: m.role == 'Manager'
                          ? AppColors.primary
                          : AppColors.success,
                      fontWeight: FontWeight.w500))),
              DataCell(Text(m.phone.isNotEmpty ? m.phone : '-')),
              DataCell(Text('₹${fmt.format(m.baseSalary)}',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600))),
              DataCell(Text('₹${fmt.format(m.paidSalary)}',
                  style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w600))),
              DataCell(Text('₹${fmt.format(rem)}',
                  style: TextStyle(
                      color: rem > 0 ? AppColors.warning : AppColors.success,
                      fontWeight: FontWeight.w600))),
              DataCell(Text(
                  m.salaryNote.isNotEmpty ? m.salaryNote : '-',
                  style: const TextStyle(color: AppColors.textMuted))),
              DataCell(Row(
                children: [
                  _actionBtn(
                    'Pay',
                    AppColors.primary,
                    () => _showSalaryModal(context, m),
                  ),
                  const SizedBox(width: 8),
                  _actionBtn(
                    'Details',
                    AppColors.textMuted,
                    () => _showEmployeeDetail(context, m, fmt),
                  ),
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
      children: crm.teamMembers.map((m) {
        final rem = m.baseSalary - m.paidSalary;
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
                  Text(m.name,
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textLight)),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: (m.role == 'Manager'
                              ? AppColors.primary
                              : AppColors.success)
                          .withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(m.role,
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: m.role == 'Manager'
                                ? AppColors.primary
                                : AppColors.success)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _fin('Base', '₹${fmt.format(m.baseSalary)}', AppColors.primary),
                  _fin('Paid', '₹${fmt.format(m.paidSalary)}', AppColors.success),
                  _fin('Remaining', '₹${fmt.format(rem)}',
                      rem > 0 ? AppColors.warning : AppColors.success),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _showSalaryModal(context, m),
                      child: const Text('Pay Salary'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _showEmployeeDetail(context, m, fmt),
                      child: const Text('Details'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _fin(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style:
                const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        Text(value,
            style: TextStyle(
                fontSize: 14, fontWeight: FontWeight.w700, color: color)),
      ],
    );
  }

  Widget _actionBtn(String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600, color: color)),
      ),
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
            Icon(Icons.work_outline, size: 48, color: AppColors.textMuted),
            SizedBox(height: 12),
            Text('No employees in directory.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
          ],
        ),
      );

  void _showSalaryModal(BuildContext context, TeamMember emp) {
    showDialog(
      context: context,
      builder: (_) => _SalaryDialog(emp: emp),
    );
  }

  void _showEmployeeDetail(
      BuildContext context, TeamMember emp, NumberFormat fmt) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.glassBorder)),
        title: const Text('Employee Profile',
            style: TextStyle(color: AppColors.textLight)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(emp.name,
                style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textLight)),
            const SizedBox(height: 6),
            Text('${emp.phone}  •  ${emp.location}',
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textMuted)),
            const SizedBox(height: 8),
            Text(
                'Role: ${emp.role}  •  Base: ₹${fmt.format(emp.baseSalary)}  •  Paid: ₹${fmt.format(emp.paidSalary)}',
                style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(
                emp.salaryNote.isNotEmpty
                    ? emp.salaryNote
                    : 'No payment note',
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textMuted)),
          ],
        ),
        actions: [
          ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close')),
        ],
      ),
    );
  }
}

class _SalaryDialog extends StatefulWidget {
  final TeamMember emp;
  const _SalaryDialog({required this.emp});

  @override
  State<_SalaryDialog> createState() => _SalaryDialogState();
}

class _SalaryDialogState extends State<_SalaryDialog> {
  late TextEditingController _base, _paid, _remaining, _note;

  @override
  void initState() {
    super.initState();
    _base = TextEditingController(
        text: widget.emp.baseSalary.toStringAsFixed(0));
    _paid = TextEditingController(
        text: widget.emp.paidSalary.toStringAsFixed(0));
    _remaining = TextEditingController();
    _note = TextEditingController(text: widget.emp.salaryNote);
    _calcRemaining();
  }

  @override
  void dispose() {
    _base.dispose();
    _paid.dispose();
    _remaining.dispose();
    _note.dispose();
    super.dispose();
  }

  void _calcRemaining() {
    final b = double.tryParse(_base.text) ?? 0;
    final p = double.tryParse(_paid.text) ?? 0;
    setState(() => _remaining.text = (b - p).toStringAsFixed(0));
  }

  void _save() {
    final crm = Provider.of<CrmProvider>(context, listen: false);
    crm.updateSalary(
      widget.emp.id,
      double.tryParse(_base.text) ?? 0,
      double.tryParse(_paid.text) ?? 0,
      _note.text.trim(),
    );
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Salary for ${widget.emp.name} saved.'),
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
                  const Text('Employee Salary',
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
              _readOnly('Employee Name', widget.emp.name),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _numField('Base Salary (₹)', _base)),
                  const SizedBox(width: 12),
                  Expanded(child: _numField('Amount Paid (₹)', _paid)),
                ],
              ),
              const SizedBox(height: 12),
              _readOnlyCtrl('Remaining (₹)', _remaining,
                  color: AppColors.warning),
              const SizedBox(height: 12),
              _textField('Payment Note', _note, hint: 'e.g. Month of April'),
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
                      child: const Text('Save Payment')),
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
            onChanged: (_) => _calcRemaining(),
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
