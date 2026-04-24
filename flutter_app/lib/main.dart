import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/crm_provider.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/main_layout.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ChangeNotifierProvider(
      create: (_) => CrmProvider(),
      child: const ArtStudioCrmApp(),
    ),
  );
}

class ArtStudioCrmApp extends StatelessWidget {
  const ArtStudioCrmApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<CrmProvider>(
      builder: (ctx, crm, _) => MaterialApp(
        title: 'Artis Studio CRM',
        debugShowCheckedModeBanner: false,
        theme: crm.isDarkTheme ? AppTheme.dark() : AppTheme.light(),
        home: crm.currentRole != null
            ? const MainLayout()
            : const LoginScreen(),
      ),
    );
  }
}
