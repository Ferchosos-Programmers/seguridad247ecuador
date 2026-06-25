import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/control_center_screen.dart';

void main() {
  runApp(const Seguridad247App());
}

class Seguridad247App extends StatelessWidget {
  const Seguridad247App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Seguridad 24/7 Ecuador',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFFD4AF37),
        scaffoldBackgroundColor: Colors.black,
        textTheme: GoogleFonts.interTextTheme(
          ThemeData.dark().textTheme,
        ),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD4AF37),
          brightness: Brightness.dark,
          primary: const Color(0xFFD4AF37),
          secondary: const Color(0xFF4287F5),
        ),
      ),
      home: const ControlCenterScreen(),
    );
  }
}
