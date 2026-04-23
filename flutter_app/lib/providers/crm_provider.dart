import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

class CrmProvider extends ChangeNotifier {
  String? currentRole; // 'Owner', 'Manager', 'Team'
  bool isDarkTheme = true;

  List<FollowUp> followUps = [];
  List<TeamMember> teamMembers = [];
  List<Client> clients = [];
  List<Student> students = [];

  Map<String, String> passwords = {
    'Owner': 'Owner@123',
    'Manager': 'Manager@123',
  };

  // Dashboard filter & follow-up tab state
  String dashboardFilter = 'All';
  String followUpTab = 'Active';
  String searchQuery = '';

  CrmProvider() {
    _loadDummyData();
    _loadFromPrefs();
  }

  bool get isOwner => currentRole == 'Owner';
  bool get isManager => currentRole == 'Manager';
  bool get isTeam => currentRole == 'Team';
  bool get canViewAmounts => isOwner || isManager;

  // ── Auth ──────────────────────────────────────────────
  bool login(String role, String password) {
    if (role == 'Team') {
      currentRole = 'Team';
      notifyListeners();
      return true;
    }
    if (passwords[role] == password) {
      currentRole = role;
      notifyListeners();
      return true;
    }
    return false;
  }

  void logout() {
    currentRole = null;
    notifyListeners();
  }

  bool changePassword(String role, String current, String newPass) {
    if (passwords[role] != current) return false;
    passwords[role] = newPass;
    _saveToPrefs();
    return true;
  }

  // ── Follow-ups ────────────────────────────────────────
  List<FollowUp> getRelevantFollowUps() {
    List<FollowUp> base = followUps;
    if (isTeam) {
      base = followUps
          .where((f) =>
              f.assign == 'Team' || f.assign.startsWith('Team:'))
          .toList();
    }
    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      base = base
          .where((f) =>
              f.client.toLowerCase().contains(q) ||
              f.desc.toLowerCase().contains(q) ||
              f.contact.toLowerCase().contains(q) ||
              f.style.toLowerCase().contains(q) ||
              f.status.toLowerCase().contains(q) ||
              f.stage.toLowerCase().contains(q))
          .toList();
    }
    return base;
  }

  void addFollowUp(FollowUp f) {
    followUps.add(f);
    _upsertClient(f);
    _saveToPrefs();
    notifyListeners();
  }

  void updateFollowUp(FollowUp updated) {
    final idx = followUps.indexWhere((f) => f.id == updated.id);
    if (idx != -1) {
      followUps[idx] = updated;
      _upsertClient(updated);
      _saveToPrefs();
      notifyListeners();
    }
  }

  void deleteFollowUp(int id) {
    followUps.removeWhere((f) => f.id == id);
    _saveToPrefs();
    notifyListeners();
  }

  void markCompleted(int id) {
    final idx = followUps.indexWhere((f) => f.id == id);
    if (idx != -1) {
      followUps[idx] = followUps[idx].copyWith(
        status: 'Completed',
        completedAt: DateTime.now().toIso8601String(),
        completedBy: currentRole,
      );
      _saveToPrefs();
      notifyListeners();
    }
  }

  void setDashboardFilter(String f) {
    dashboardFilter = f;
    notifyListeners();
  }

  void setFollowUpTab(String tab) {
    followUpTab = tab;
    notifyListeners();
  }

  void setSearchQuery(String q) {
    searchQuery = q.toLowerCase().trim();
    notifyListeners();
  }

  // ── Team Members ──────────────────────────────────────
  void addTeamMember(TeamMember m) {
    teamMembers.add(m);
    _saveToPrefs();
    notifyListeners();
  }

  void updateTeamMember(TeamMember updated) {
    final idx = teamMembers.indexWhere((m) => m.id == updated.id);
    if (idx != -1) {
      teamMembers[idx] = updated;
      _saveToPrefs();
      notifyListeners();
    }
  }

  void deleteTeamMember(int id) {
    teamMembers.removeWhere((m) => m.id == id);
    _saveToPrefs();
    notifyListeners();
  }

  void updateSalary(int empId, double base, double paid, String note) {
    final idx = teamMembers.indexWhere((m) => m.id == empId);
    if (idx != -1) {
      teamMembers[idx] = teamMembers[idx].copyWith(
        baseSalary: base,
        paidSalary: paid,
        salaryNote: note,
      );
      _saveToPrefs();
      notifyListeners();
    }
  }

  // ── Students ──────────────────────────────────────────
  void addStudent(Student s) {
    students.add(s);
    _saveToPrefs();
    notifyListeners();
  }

  void updateStudent(Student updated) {
    final idx = students.indexWhere((s) => s.id == updated.id);
    if (idx != -1) {
      students[idx] = updated;
      _saveToPrefs();
      notifyListeners();
    }
  }

  void deleteStudent(int id) {
    students.removeWhere((s) => s.id == id);
    _saveToPrefs();
    notifyListeners();
  }

  void updateStudentFee(
      int stuId, double monthly, double charged, String note) {
    final idx = students.indexWhere((s) => s.id == stuId);
    if (idx != -1) {
      students[idx] = students[idx].copyWith(
        monthlyFee: monthly,
        chargedFee: charged,
        feeNote: note,
      );
      _saveToPrefs();
      notifyListeners();
    }
  }

  // ── Clients ───────────────────────────────────────────
  void deleteClient(int id) {
    clients.removeWhere((c) => c.id == id);
    _saveToPrefs();
    notifyListeners();
  }

  void _upsertClient(FollowUp f) {
    final key = f.client.toLowerCase().trim();
    final existing = clients.firstWhere(
      (c) => c.name.toLowerCase() == key,
      orElse: () => Client(id: -1, name: ''),
    );
    if (existing.id == -1) {
      clients.add(Client(
        id: DateTime.now().millisecondsSinceEpoch,
        name: f.client,
        contact: f.contact.isNotEmpty ? f.contact : '-',
        location: f.location.isNotEmpty
            ? (f.state.isNotEmpty ? '${f.location}, ${f.state}' : f.location)
            : '-',
      ));
    }
  }

  // ── Theme ─────────────────────────────────────────────
  void toggleTheme() {
    isDarkTheme = !isDarkTheme;
    _saveToPrefs();
    notifyListeners();
  }

  void setTheme(bool dark) {
    isDarkTheme = dark;
    _saveToPrefs();
    notifyListeners();
  }

  // ── Stats helpers ──────────────────────────────────────
  int get totalTasks => getRelevantFollowUps().length;
  int get pendingTasks =>
      getRelevantFollowUps().where((f) => f.status == 'Pending').length;
  int get completedTasks =>
      getRelevantFollowUps().where((f) => f.status == 'Completed').length;

  double get totalRevenue {
    return followUps
        .where((f) => f.status != 'Completed')
        .fold(0, (sum, f) => sum + f.total);
  }

  double get totalReceived =>
      followUps.fold(0, (sum, f) => sum + f.advance);

  double get monthlyRevenue {
    final now = DateTime.now();
    return followUps
        .where((f) {
          if (f.date.isEmpty) return false;
          final d = DateTime.tryParse(f.date);
          return d != null &&
              d.year == now.year &&
              d.month == now.month;
        })
        .fold(0, (sum, f) => sum + f.advance);
  }

  // ── Persistence ───────────────────────────────────────
  Future<void> _saveToPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      prefs.setString(
          'followUps', jsonEncode(followUps.map((f) => f.toMap()).toList()));
      prefs.setString('teamMembers',
          jsonEncode(teamMembers.map((m) => m.toMap()).toList()));
      prefs.setString(
          'clients', jsonEncode(clients.map((c) => c.toMap()).toList()));
      prefs.setString(
          'students', jsonEncode(students.map((s) => s.toMap()).toList()));
      prefs.setString('passwords', jsonEncode(passwords));
      prefs.setBool('isDarkTheme', isDarkTheme);
    } catch (_) {}
  }

  Future<void> _loadFromPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final fuRaw = prefs.getString('followUps');
      if (fuRaw != null) {
        followUps = (jsonDecode(fuRaw) as List)
            .map((m) => FollowUp.fromMap(Map<String, dynamic>.from(m)))
            .toList();
      }
      final tmRaw = prefs.getString('teamMembers');
      if (tmRaw != null) {
        teamMembers = (jsonDecode(tmRaw) as List)
            .map((m) => TeamMember.fromMap(Map<String, dynamic>.from(m)))
            .toList();
      }
      final clRaw = prefs.getString('clients');
      if (clRaw != null) {
        clients = (jsonDecode(clRaw) as List)
            .map((m) => Client.fromMap(Map<String, dynamic>.from(m)))
            .toList();
      }
      final stuRaw = prefs.getString('students');
      if (stuRaw != null) {
        students = (jsonDecode(stuRaw) as List)
            .map((m) => Student.fromMap(Map<String, dynamic>.from(m)))
            .toList();
      }
      final passRaw = prefs.getString('passwords');
      if (passRaw != null) {
        passwords = Map<String, String>.from(jsonDecode(passRaw));
      }
      isDarkTheme = prefs.getBool('isDarkTheme') ?? true;
    } catch (_) {}
    notifyListeners();
  }

  void _loadDummyData() {
    final now = DateTime.now();
    final fmt = (DateTime d) =>
        '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

    followUps = [
      FollowUp(
        id: 1001,
        client: 'Priya Sharma',
        contact: '+91 98765 43210',
        location: 'Mumbai',
        state: 'Maharashtra',
        style: '3D Wall Art',
        size: '48x36 inches',
        desc: 'Abstract 3D floral design for living room accent wall',
        total: 45000,
        advance: 20000,
        remaining: 25000,
        date: fmt(now.add(const Duration(days: 12))),
        status: 'In Progress',
        stage: 'on hand Arto',
        stageNote: 'Colors approved',
        assign: 'Manager',
      ),
      FollowUp(
        id: 1002,
        client: 'Ravi Mehta',
        contact: '+91 87654 32109',
        location: 'Surat',
        state: 'Gujarat',
        style: 'Resin Art',
        size: '24x24 inches',
        desc: 'Ocean theme resin pour with gold flakes',
        total: 18000,
        advance: 8000,
        remaining: 10000,
        date: fmt(now.add(const Duration(days: 6))),
        status: 'Pending',
        stage: 'in colour booth',
        stageNote: '',
        assign: 'Team',
      ),
      FollowUp(
        id: 1003,
        client: 'Anita Patel',
        contact: '+91 76543 21098',
        location: 'Ahmedabad',
        state: 'Gujarat',
        style: 'Wall Mural',
        size: '8x5 feet',
        desc: 'Rajasthani heritage mural for hotel lobby',
        total: 95000,
        advance: 50000,
        remaining: 45000,
        date: fmt(now.add(const Duration(days: 20))),
        status: 'In Progress',
        stage: 'Delivery Stage',
        stageNote: 'Final touches pending',
        assign: 'Manager',
        completedAt: null,
      ),
      FollowUp(
        id: 1004,
        client: 'Deepak Verma',
        contact: '+91 65432 10987',
        location: 'Delhi',
        state: 'Delhi',
        style: 'Interior Styling',
        size: '12x8 feet',
        desc: 'Full room interior redesign with accent pieces',
        total: 120000,
        advance: 120000,
        remaining: 0,
        date: fmt(now.subtract(const Duration(days: 5))),
        status: 'Completed',
        stage: 'Delivered',
        stageNote: 'Client approved',
        assign: 'Unassigned',
        completedAt: now.subtract(const Duration(days: 5)).toIso8601String(),
        completedBy: 'Owner',
      ),
      FollowUp(
        id: 1005,
        client: 'Sneha Joshi',
        contact: '+91 54321 09876',
        location: 'Pune',
        state: 'Maharashtra',
        style: 'Customisation',
        size: '30x20 inches',
        desc: 'Custom family portrait in oil on canvas',
        total: 22000,
        advance: 5000,
        remaining: 17000,
        date: fmt(now.add(const Duration(days: 8))),
        status: 'Pending',
        stage: 'on Client Confirmation',
        stageNote: '',
        assign: 'Unassigned',
      ),
    ];

    teamMembers = [
      TeamMember(
        id: 201,
        name: 'Amit Gupta',
        role: 'Manager',
        phone: '+91 91234 56789',
        location: 'Surat',
        baseSalary: 35000,
        paidSalary: 35000,
        salaryNote: 'April paid',
      ),
      TeamMember(
        id: 202,
        name: 'Rahul Desai',
        role: 'Team',
        phone: '+91 82345 67890',
        location: 'Ahmedabad',
        baseSalary: 18000,
        paidSalary: 12000,
        salaryNote: 'Partial April',
      ),
      TeamMember(
        id: 203,
        name: 'Neha Singh',
        role: 'Team',
        phone: '+91 73456 78901',
        location: 'Mumbai',
        baseSalary: 20000,
        paidSalary: 20000,
        salaryNote: 'April paid',
      ),
    ];

    clients = [
      Client(id: 301, name: 'Priya Sharma', contact: '+91 98765 43210', location: 'Mumbai, Maharashtra'),
      Client(id: 302, name: 'Ravi Mehta', contact: '+91 87654 32109', location: 'Surat, Gujarat'),
      Client(id: 303, name: 'Anita Patel', contact: '+91 76543 21098', location: 'Ahmedabad, Gujarat'),
      Client(id: 304, name: 'Deepak Verma', contact: '+91 65432 10987', location: 'Delhi, Delhi'),
      Client(id: 305, name: 'Sneha Joshi', contact: '+91 54321 09876', location: 'Pune, Maharashtra'),
    ];

    students = [
      Student(
        id: 401,
        name: 'Ayush Sharma',
        course: 'Fine Arts',
        phone: '+91 90123 45678',
        location: 'Mumbai',
        date: '2024-01-15',
        monthlyFee: 5000,
        chargedFee: 5000,
        contract: 'Standard 6-month course',
        feeNote: 'April paid - GPay',
      ),
      Student(
        id: 402,
        name: 'Kavya Nair',
        course: 'Resin Art',
        phone: '+91 89012 34567',
        location: 'Kochi',
        date: '2024-02-01',
        monthlyFee: 3500,
        chargedFee: 2000,
        feeNote: 'Partial April',
      ),
      Student(
        id: 403,
        name: 'Rohan Patel',
        course: 'Wall Mural Design',
        phone: '+91 78901 23456',
        location: 'Ahmedabad',
        date: '2024-03-10',
        monthlyFee: 4500,
        chargedFee: 0,
        feeNote: '',
      ),
    ];
  }
}
