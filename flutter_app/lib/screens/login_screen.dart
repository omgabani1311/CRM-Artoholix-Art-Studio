import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String? _selectedRole;
  final _passwordController = TextEditingController();
  bool _obscure = true;
  String? _errorMsg;

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  void _selectRole(String role, CrmProvider crm) {
    if (role == 'Team') {
      crm.login('Team', '');
      return;
    }
    setState(() {
      _selectedRole = role;
      _errorMsg = null;
      _passwordController.clear();
    });
  }

  void _submitLogin(CrmProvider crm) {
    if (_selectedRole == null) return;
    final success = crm.login(_selectedRole!, _passwordController.text);
    if (!success) {
      setState(() => _errorMsg = 'Incorrect password for $_selectedRole.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context, listen: false);
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        children: [
          // Animated background blobs
          Positioned(
            top: -100,
            left: -100,
            child: _blob(400, const Color(0x26D4AF37)),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: _blob(300, const Color(0x263B82F6)),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: _GlassCard(
                  child: Padding(
                    padding: const EdgeInsets.all(36),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Logo
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: const Color(0x1AD4AF37),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: AppColors.primary.withOpacity(0.3),
                            ),
                          ),
                          child: const Icon(
                            Icons.palette,
                            color: AppColors.primary,
                            size: 40,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Artis Studio CRM',
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: AppColors.textLight,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Welcome! Select your role to continue',
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 32),

                        if (_selectedRole == null) ...[
                          // Role selection grid
                          Row(
                            children: [
                              _RoleCard(
                                icon: Icons.workspace_premium,
                                label: 'Owner',
                                onTap: () => _selectRole('Owner', crm),
                              ),
                              const SizedBox(width: 12),
                              _RoleCard(
                                icon: Icons.work_outline,
                                label: 'Manager',
                                onTap: () => _selectRole('Manager', crm),
                              ),
                              const SizedBox(width: 12),
                              _RoleCard(
                                icon: Icons.brush,
                                label: 'Arto Team',
                                onTap: () => _selectRole('Team', crm),
                              ),
                            ],
                          ),
                        ] else ...[
                          // Password form
                          Row(
                            children: [
                              IconButton(
                                onPressed: () =>
                                    setState(() => _selectedRole = null),
                                icon: const Icon(Icons.arrow_back,
                                    color: AppColors.textMuted),
                                padding: EdgeInsets.zero,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Login as $_selectedRole',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textLight,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          if (_errorMsg != null)
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.danger.withOpacity(0.1),
                                border: Border.all(
                                    color: AppColors.danger.withOpacity(0.3)),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(_errorMsg!,
                                  style: const TextStyle(
                                      color: AppColors.danger, fontSize: 13)),
                            ),
                          if (_errorMsg != null) const SizedBox(height: 16),

                          TextField(
                            controller: _passwordController,
                            obscureText: _obscure,
                            onSubmitted: (_) => _submitLogin(crm),
                            style: const TextStyle(color: AppColors.textLight),
                            decoration: InputDecoration(
                              labelText: 'Password',
                              hintText: 'Enter secure password',
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscure
                                      ? Icons.visibility_off
                                      : Icons.visibility,
                                  color: AppColors.textMuted,
                                  size: 20,
                                ),
                                onPressed: () =>
                                    setState(() => _obscure = !_obscure),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Min 8 chars, 1 Uppercase, 1 Number, 1 Special Char',
                              style: TextStyle(
                                  color: AppColors.textMuted, fontSize: 11),
                            ),
                          ),
                          const SizedBox(height: 20),

                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: () => _submitLogin(crm),
                              child: const Text('Secure Login'),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _blob(double size, Color color) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  const _GlassCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xB30F0F0F),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 32,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _RoleCard extends StatefulWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  State<_RoleCard> createState() => _RoleCardState();
}

class _RoleCardState extends State<_RoleCard> {
  bool _hovering = false;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovering = true),
        onExit: (_) => setState(() => _hovering = false),
        child: GestureDetector(
          onTap: widget.onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(vertical: 20),
            decoration: BoxDecoration(
              color: _hovering
                  ? AppColors.primary.withOpacity(0.1)
                  : Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _hovering
                    ? AppColors.primary
                    : AppColors.glassBorder,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: _hovering
                        ? AppColors.primary
                        : Colors.white.withOpacity(0.05),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    widget.icon,
                    color: _hovering ? Colors.white : AppColors.textMuted,
                    size: 24,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: _hovering ? AppColors.primary : AppColors.textMuted,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
