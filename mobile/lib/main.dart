import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';
import 'theme/app_theme.dart';

final navigatorKey = GlobalKey<NavigatorState>();

void main() {
  // Token expirado (8 h): volta para o login de qualquer tela
  ApiService.aoExpirar = () {
    ApiService.sair();
    navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  };
  runApp(const FitControlApp());
}

class FitControlApp extends StatelessWidget {
  const FitControlApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'FITCONTROL',
      debugShowCheckedModeBanner: false,
      theme: fitTheme,
      home: const LoginScreen(),
    );
  }
}
