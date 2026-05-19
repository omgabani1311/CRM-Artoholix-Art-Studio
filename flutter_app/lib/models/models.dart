class FollowUp {
  final int id;
  String client;
  String contact;
  String location;
  String state;
  String style;
  String size;
  String desc;
  double total;
  double advance;
  double remaining;
  String date;
  String status;
  String stage;
  String stageNote;
  String assign;
  String? completedAt;
  String? completedBy;

  FollowUp({
    required this.id,
    required this.client,
    this.contact = '',
    this.location = '',
    this.state = '',
    this.style = '',
    this.size = '',
    this.desc = '',
    this.total = 0,
    this.advance = 0,
    this.remaining = 0,
    required this.date,
    this.status = 'Pending',
    this.stage = '',
    this.stageNote = '',
    this.assign = 'Unassigned',
    this.completedAt,
    this.completedBy,
  });

  FollowUp copyWith({
    String? client,
    String? contact,
    String? location,
    String? state,
    String? style,
    String? size,
    String? desc,
    double? total,
    double? advance,
    double? remaining,
    String? date,
    String? status,
    String? stage,
    String? stageNote,
    String? assign,
    String? completedAt,
    String? completedBy,
  }) {
    return FollowUp(
      id: id,
      client: client ?? this.client,
      contact: contact ?? this.contact,
      location: location ?? this.location,
      state: state ?? this.state,
      style: style ?? this.style,
      size: size ?? this.size,
      desc: desc ?? this.desc,
      total: total ?? this.total,
      advance: advance ?? this.advance,
      remaining: remaining ?? this.remaining,
      date: date ?? this.date,
      status: status ?? this.status,
      stage: stage ?? this.stage,
      stageNote: stageNote ?? this.stageNote,
      assign: assign ?? this.assign,
      completedAt: completedAt ?? this.completedAt,
      completedBy: completedBy ?? this.completedBy,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'client': client,
        'contact': contact,
        'location': location,
        'state': state,
        'style': style,
        'size': size,
        'desc': desc,
        'total': total,
        'advance': advance,
        'remaining': remaining,
        'date': date,
        'status': status,
        'stage': stage,
        'stageNote': stageNote,
        'assign': assign,
        'completedAt': completedAt,
        'completedBy': completedBy,
      };

  factory FollowUp.fromMap(Map<String, dynamic> m) => FollowUp(
        id: m['id'] as int,
        client: m['client'] ?? '',
        contact: m['contact'] ?? '',
        location: m['location'] ?? '',
        state: m['state'] ?? '',
        style: m['style'] ?? '',
        size: m['size'] ?? '',
        desc: m['desc'] ?? '',
        total: (m['total'] ?? 0).toDouble(),
        advance: (m['advance'] ?? 0).toDouble(),
        remaining: (m['remaining'] ?? 0).toDouble(),
        date: m['date'] ?? '',
        status: m['status'] ?? 'Pending',
        stage: m['stage'] ?? '',
        stageNote: m['stageNote'] ?? '',
        assign: m['assign'] ?? 'Unassigned',
        completedAt: m['completedAt'],
        completedBy: m['completedBy'],
      );
}

class TeamMember {
  final int id;
  String name;
  String role;
  String phone;
  String location;
  double baseSalary;
  double paidSalary;
  String salaryNote;

  TeamMember({
    required this.id,
    required this.name,
    this.role = 'Team',
    this.phone = '',
    this.location = '',
    this.baseSalary = 0,
    this.paidSalary = 0,
    this.salaryNote = '',
  });

  TeamMember copyWith({
    String? name,
    String? role,
    String? phone,
    String? location,
    double? baseSalary,
    double? paidSalary,
    String? salaryNote,
  }) {
    return TeamMember(
      id: id,
      name: name ?? this.name,
      role: role ?? this.role,
      phone: phone ?? this.phone,
      location: location ?? this.location,
      baseSalary: baseSalary ?? this.baseSalary,
      paidSalary: paidSalary ?? this.paidSalary,
      salaryNote: salaryNote ?? this.salaryNote,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'role': role,
        'phone': phone,
        'location': location,
        'baseSalary': baseSalary,
        'paidSalary': paidSalary,
        'salaryNote': salaryNote,
      };

  factory TeamMember.fromMap(Map<String, dynamic> m) => TeamMember(
        id: m['id'] as int,
        name: m['name'] ?? '',
        role: m['role'] ?? 'Team',
        phone: m['phone'] ?? '',
        location: m['location'] ?? '',
        baseSalary: (m['baseSalary'] ?? 0).toDouble(),
        paidSalary: (m['paidSalary'] ?? 0).toDouble(),
        salaryNote: m['salaryNote'] ?? '',
      );
}

class Client {
  final int id;
  String name;
  String contact;
  String location;

  Client({
    required this.id,
    required this.name,
    this.contact = '-',
    this.location = '-',
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'contact': contact,
        'location': location,
      };

  factory Client.fromMap(Map<String, dynamic> m) => Client(
        id: m['id'] as int,
        name: m['name'] ?? '',
        contact: m['contact'] ?? '-',
        location: m['location'] ?? '-',
      );
}

class Student {
  final int id;
  String name;
  String course;
  String phone;
  String location;
  String date;
  double monthlyFee;
  double chargedFee;
  String contract;
  String feeNote;

  Student({
    required this.id,
    required this.name,
    this.course = '',
    this.phone = '',
    this.location = '',
    required this.date,
    this.monthlyFee = 0,
    this.chargedFee = 0,
    this.contract = '',
    this.feeNote = '',
  });

  Student copyWith({
    String? name,
    String? course,
    String? phone,
    String? location,
    String? date,
    double? monthlyFee,
    double? chargedFee,
    String? contract,
    String? feeNote,
  }) {
    return Student(
      id: id,
      name: name ?? this.name,
      course: course ?? this.course,
      phone: phone ?? this.phone,
      location: location ?? this.location,
      date: date ?? this.date,
      monthlyFee: monthlyFee ?? this.monthlyFee,
      chargedFee: chargedFee ?? this.chargedFee,
      contract: contract ?? this.contract,
      feeNote: feeNote ?? this.feeNote,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'course': course,
        'phone': phone,
        'location': location,
        'date': date,
        'monthlyFee': monthlyFee,
        'chargedFee': chargedFee,
        'contract': contract,
        'feeNote': feeNote,
      };

  factory Student.fromMap(Map<String, dynamic> m) => Student(
        id: m['id'] as int,
        name: m['name'] ?? '',
        course: m['course'] ?? '',
        phone: m['phone'] ?? '',
        location: m['location'] ?? '',
        date: m['date'] ?? '',
        monthlyFee: (m['monthlyFee'] ?? 0).toDouble(),
        chargedFee: (m['chargedFee'] ?? 0).toDouble(),
        contract: m['contract'] ?? '',
        feeNote: m['feeNote'] ?? '',
      );
}

const List<String> artStyles = [
  '3D Wall Art',
  'Wall Mural',
  'Interior Styling',
  'Customisation',
  'Resin Art',
];

const List<String> followUpStatuses = [
  'Pending',
  'In Progress',
  'Completed',
  'Confirmation Pending',
];

const List<String> followUpStages = [
  'in colour booth',
  'on hand brijesh',
  'on hand agency',
  'Confirmation Panding',
  'on hand Arto',
  'Delivered',
  'Delivery Stage',
  'on Client Confirmation',
];

const Map<String, String> cityStateMap = {
  'Ahmedabad': 'Gujarat',
  'Surat': 'Gujarat',
  'Vadodara': 'Gujarat',
  'Rajkot': 'Gujarat',
  'Bhavnagar': 'Gujarat',
  'Gandhinagar': 'Gujarat',
  'Junagadh': 'Gujarat',
  'Anand': 'Gujarat',
  'Mumbai': 'Maharashtra',
  'Delhi': 'Delhi',
  'Bangalore': 'Karnataka',
  'Hyderabad': 'Telangana',
  'Chennai': 'Tamil Nadu',
  'Kolkata': 'West Bengal',
  'Pune': 'Maharashtra',
  'Jaipur': 'Rajasthan',
  'Lucknow': 'Uttar Pradesh',
  'Nagpur': 'Maharashtra',
  'Indore': 'Madhya Pradesh',
  'Chandigarh': 'Chandigarh',
  'Bhopal': 'Madhya Pradesh',
  'Patna': 'Bihar',
  'Coimbatore': 'Tamil Nadu',
  'Kochi': 'Kerala',
  'Visakhapatnam': 'Andhra Pradesh',
  'Ludhiana': 'Punjab',
  'Amritsar': 'Punjab',
  'Jodhpur': 'Rajasthan',
  'Raipur': 'Chhattisgarh',
  'Guwahati': 'Assam',
  'Bhubaneswar': 'Odisha',
};
