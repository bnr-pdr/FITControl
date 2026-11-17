import 'package:flutter/material.dart';

class AppColors {
  static const preto = Color(0xFF0D0D0D);
  static const cinzaEscuro = Color(0xFF1E1E1E);
  static const cinza = Color(0xFF8E8E93);
  static const vermelho = Color(0xFFE10600);
  static const branco = Color(0xFFFFFFFF);
}

final ThemeData fitTheme = ThemeData(
  useMaterial3: true,
  brightness: Brightness.dark,
  scaffoldBackgroundColor: AppColors.preto,
  colorScheme: const ColorScheme.dark(
    primary: AppColors.vermelho,
    onPrimary: AppColors.branco,
    surface: AppColors.cinzaEscuro,
    onSurface: AppColors.branco,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.preto,
    foregroundColor: AppColors.branco,
    elevation: 0,
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.cinzaEscuro,
    labelStyle: const TextStyle(color: AppColors.cinza),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide.none,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.vermelho, width: 2),
    ),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.vermelho,
      foregroundColor: AppColors.branco,
      minimumSize: const Size.fromHeight(52),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
    ),
  ),
);
