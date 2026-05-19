import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Settings',
            style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: AppColors.textLight)),
        SizedBox(height: 4),
        Text('Customize your CRM experience.',
            style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
        SizedBox(height: 24),
        LayoutBuilder(builder: _responsiveLayout),
      ],
    );
  }

  static Widget _responsiveLayout(BuildContext ctx, BoxConstraints bc) {
    final isWide = bc.maxWidth > 600;
    final profileCard = _ProfileCard();
    final passwordCard = _PasswordCard();
    final themeCard = _ThemeCard();

    if (isWide) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(children: [profileCard, const SizedBox(height: 16), themeCard]),
          ),
          const SizedBox(width: 20),
          Expanded(child: passwordCard),
        ],
      );
    }
    return Column(children: [
      profileCard,
      const SizedBox(height: 16),
      themeCard,
      const SizedBox(height: 16),
      passwordCard,
    ]);
  }
}

class _ProfileCard extends StatefulWidget {
  @override
  State<_ProfileCard> createState() => _ProfileCardState();
}

class _ProfileCardState extends State<_ProfileCard> {
  final _nameCtrl = TextEditingController(text: 'Artis Studio Co.');
  final _emailCtrl = TextEditingController(text: 'admin@artis.com');
  String _currency = 'INR';

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Profile Settings',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary)),
          const SizedBox(height: 16),
          _lbl('Studio Name'),
          TextFormField(
            controller: _nameCtrl,
            style: const TextStyle(color: AppColors.textLight, fontSize: 14),
            decoration: const InputDecoration(),
          ),
          const SizedBox(height: 12),
          _lbl('Notification Email'),
          TextFormField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(color: AppColors.textLight, fontSize: 14),
            decoration: const InputDecoration(),
          ),
          const SizedBox(height: 12),
          _lbl('Currency'),
          DropdownButtonFormField<String>(
            value: _currency,
            dropdownColor: const Color(0xFF1A1A1A),
            style: const TextStyle(color: AppColors.textLight, fontSize: 14),
            decoration: const InputDecoration(),
            items: const [
              DropdownMenuItem(value: 'INR', child: Text('INR (₹)')),
              DropdownMenuItem(value: 'USD', child: Text('USD (\$)')),
            ],
            onChanged: (v) => setState(() => _currency = v!),
          ),
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Settings saved successfully!'),
                backgroundColor: AppColors.success,
              ),
            ),
            child: const Text('Save Preferences'),
          ),
        ],
      ),
    );
  }
}

class _ThemeCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<CrmProvider>(
      builder: (ctx, crm, _) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.glassBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Theme',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary)),
            const SizedBox(height: 16),
            Row(
              children: [
                _ThemeOption(
                  label: 'Dark Glass',
                  icon: Icons.dark_mode_outlined,
                  selected: crm.isDarkTheme,
                  onTap: () => crm.setTheme(true),
                ),
                const SizedBox(width: 12),
                _ThemeOption(
                  label: 'Light Minimal',
                  icon: Icons.light_mode_outlined,
                  selected: !crm.isDarkTheme,
                  onTap: () => crm.setTheme(false),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeOption extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _ThemeOption({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withOpacity(0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected
                ? AppColors.primary
                : AppColors.glassBorder,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                color: selected ? AppColors.primary : AppColors.textMuted,
                size: 18),
            const SizedBox(width: 8),
            Text(label,
                style: TextStyle(
                    fontSize: 13,
                    color:
                        selected ? AppColors.primary : AppColors.textMuted,
                    fontWeight: selected
                        ? FontWeight.w600
                        : FontWeight.w400)),
          ],
        ),
      ),
    );
  }
}

class _PasswordCard extends StatefulWidget {
  @override
  State<_PasswordCard> createState() => _PasswordCardState();
}

class _PasswordCardState extends State<_PasswordCard> {
  final _formKey = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  String? _errorMsg;
  String? _successMsg;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  void _changePassword() {
    setState(() {
      _errorMsg = null;
      _successMsg = null;
    });

    if (!_formKey.currentState!.validate()) return;

    final crm = Provider.of<CrmProvider>(context, listen: false);
    final role = crm.currentRole ?? '';

    final passRegex =
        RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$');
    if (!passRegex.hasMatch(_newCtrl.text)) {
      setState(() => _errorMsg =
          'Password must have 8+ chars, uppercase, lowercase, number, special char.');
      return;
    }

    if (_newCtrl.text != _confirmCtrl.text) {
      setState(() => _errorMsg = 'New passwords do not match.');
      return;
    }

    final ok =
        crm.changePassword(role, _currentCtrl.text, _newCtrl.text);
    if (!ok) {
      setState(() => _errorMsg = 'Current password is incorrect.');
      return;
    }

    setState(() {
      _successMsg = 'Password updated successfully!';
      _errorMsg = null;
    });
    _formKey.currentState!.reset();
  }

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context, listen: false);
    if (crm.isTeam) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.glassBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: const Text(
          'Password management is restricted to Owner and Manager.',
          style: TextStyle(color: AppColors.textMuted, fontSize: 13),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.glassBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Change Password',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary)),
            const SizedBox(height: 16),

            if (_errorMsg != null)
              _msgBox(_errorMsg!, AppColors.danger),
            if (_successMsg != null)
              _msgBox(_successMsg!, AppColors.success),

            _passField('Current Password', _currentCtrl),
            const SizedBox(height: 12),
            _passField('New Password', _newCtrl),
            const SizedBox(height: 6),
            const Text(
              'Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char',
              style: TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
            const SizedBox(height: 12),
            _passField('Confirm New Password', _confirmCtrl),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _changePassword,
              child: const Text('Update Password'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _msgBox(String msg, Color color) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(msg,
          style: TextStyle(color: color, fontSize: 13)),
    );
  }

  Widget _passField(String label, TextEditingController ctrl) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _lbl(label),
        TextFormField(
          controller: ctrl,
          obscureText: true,
          style: const TextStyle(color: AppColors.textLight, fontSize: 14),
          decoration: const InputDecoration(),
          validator: (v) =>
              (v == null || v.isEmpty) ? 'Required' : null,
        ),
      ],
    );
  }
}

Widget _lbl(String text) => Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text,
          style: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w500)),
    );
