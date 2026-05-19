import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/crm_provider.dart';
import '../theme/app_theme.dart';
import '../pages/dashboard_page.dart';
import '../pages/followups_page.dart';
import '../pages/team_page.dart';
import '../pages/clients_page.dart';
import '../pages/analytics_page.dart';
import '../pages/employees_page.dart';
import '../pages/students_page.dart';
import '../pages/settings_page.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  String _currentPage = 'dashboard';

  static const _navItems = [
    _NavItem('dashboard', 'Dashboard', Icons.grid_view_outlined),
    _NavItem('followups', 'Follow-ups', Icons.checklist_outlined),
    _NavItem('team', 'Manage Team', Icons.badge_outlined, ownerOnly: true),
    _NavItem('clients', 'Clients', Icons.group_outlined, mgmt: true),
    _NavItem('analytics', 'Analytics', Icons.bar_chart_outlined, mgmt: true),
    _NavItem('employees', 'Employees', Icons.work_outline, ownerOnly: true),
    _NavItem('students', 'Students', Icons.menu_book_outlined, ownerOnly: true),
    _NavItem('settings', 'Settings', Icons.settings_outlined),
  ];

  void _navigate(String page) {
    setState(() => _currentPage = page);
    if (Scaffold.of(context).isDrawerOpen) {
      Navigator.pop(context);
    }
  }

  Widget _buildPage() {
    switch (_currentPage) {
      case 'followups':
        return const FollowUpsPage();
      case 'team':
        return const TeamPage();
      case 'clients':
        return const ClientsPage();
      case 'analytics':
        return const AnalyticsPage();
      case 'employees':
        return const EmployeesPage();
      case 'students':
        return const StudentsPage();
      case 'settings':
        return const SettingsPage();
      default:
        return DashboardPage(onNavigate: _navigate);
    }
  }

  @override
  Widget build(BuildContext context) {
    final crm = Provider.of<CrmProvider>(context);
    final isWide = MediaQuery.of(context).size.width >= 900;

    final sidebar = _Sidebar(
      currentPage: _currentPage,
      onNavigate: _navigate,
      navItems: _navItems.where((n) {
        if (n.ownerOnly && !crm.isOwner) return false;
        if (n.mgmt && crm.isTeam) return false;
        return true;
      }).toList(),
    );

    return Scaffold(
      drawer: isWide ? null : Drawer(
        backgroundColor: const Color(0xFF0D0D0D),
        child: sidebar,
      ),
      body: Row(
        children: [
          if (isWide) SizedBox(width: 240, child: sidebar),
          Expanded(
            child: Column(
              children: [
                _TopBar(
                  currentPage: _currentPage,
                  onMenuTap: isWide ? null : () => Scaffold.of(context).openDrawer(),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
                    child: _buildPage(),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
class _Sidebar extends StatelessWidget {
  final String currentPage;
  final void Function(String) onNavigate;
  final List<_NavItem> navItems;

  const _Sidebar({
    required this.currentPage,
    required this.onNavigate,
    required this.navItems,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0D0D0D),
        border: Border(right: BorderSide(color: AppColors.glassBorder)),
      ),
      child: Column(
        children: [
          // Logo header
          Container(
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.glassBorder)),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.palette, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Artis CRM',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textLight,
                      ),
                    ),
                    const Text(
                      'Art Studio',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Nav links
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 12),
              children: navItems
                  .map((item) => _NavTile(
                        item: item,
                        isActive: currentPage == item.id,
                        onTap: () => onNavigate(item.id),
                      ))
                  .toList(),
            ),
          ),

          // Bottom role badge
          Consumer<CrmProvider>(
            builder: (ctx, crm, _) => Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.glassBorder)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.person, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          crm.currentRole ?? '',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textLight,
                          ),
                        ),
                        const Text(
                          'Artis Studio',
                          style: TextStyle(
                              fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => crm.logout(),
                    icon: const Icon(Icons.logout,
                        color: AppColors.textMuted, size: 18),
                    tooltip: 'Logout',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  final _NavItem item;
  final bool isActive;
  final VoidCallback onTap;

  const _NavTile({
    required this.item,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border(
            left: BorderSide(
              color: isActive ? AppColors.primary : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        child: Row(
          children: [
            Icon(
              item.icon,
              size: 20,
              color: isActive ? AppColors.primary : AppColors.textMuted,
            ),
            const SizedBox(width: 12),
            Text(
              item.label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive ? AppColors.primary : AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Top Bar ───────────────────────────────────────────────────────────────────
class _TopBar extends StatelessWidget {
  final String currentPage;
  final VoidCallback? onMenuTap;

  const _TopBar({required this.currentPage, this.onMenuTap});

  String _pageTitle() {
    const titles = {
      'dashboard': 'Dashboard',
      'followups': 'All Follow-ups',
      'team': 'Team Directory',
      'clients': 'Client Directory',
      'analytics': 'Studio Analytics',
      'employees': 'Employees Dashboard',
      'students': 'Students Dashboard',
      'settings': 'Settings',
    };
    return titles[currentPage] ?? 'Dashboard';
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CrmProvider>(
      builder: (ctx, crm, _) => Container(
        height: 64,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: const BoxDecoration(
          color: Color(0x80000000),
          border: Border(bottom: BorderSide(color: AppColors.glassBorder)),
        ),
        child: Row(
          children: [
            if (onMenuTap != null)
              IconButton(
                onPressed: onMenuTap,
                icon: const Icon(Icons.menu, color: AppColors.textLight),
              ),
            if (onMenuTap != null) const SizedBox(width: 8),

            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Welcome, ${crm.currentRole}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textLight,
                    ),
                  ),
                  const Text(
                    "Here's your studio overview",
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),

            // Search bar
            Container(
              width: 260,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child: TextField(
                onChanged: crm.setSearchQuery,
                style: const TextStyle(
                    color: AppColors.textLight, fontSize: 13),
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search,
                      color: AppColors.textMuted, size: 18),
                  hintText: 'Search clients, projects...',
                  hintStyle:
                      TextStyle(color: AppColors.textMuted, fontSize: 13),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Role badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                crm.currentRole ?? '',
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 8),

            // Avatar
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person, color: Colors.white, size: 18),
            ),

            const SizedBox(width: 4),
            IconButton(
              onPressed: crm.logout,
              icon: const Icon(Icons.logout,
                  color: AppColors.textMuted, size: 20),
              tooltip: 'Logout',
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  final String id;
  final String label;
  final IconData icon;
  final bool ownerOnly;
  final bool mgmt;

  const _NavItem(this.id, this.label, this.icon,
      {this.ownerOnly = false, this.mgmt = false});
}
