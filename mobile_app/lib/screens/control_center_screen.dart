import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:animate_do/animate_do.dart';
import 'package:url_launcher/url_launcher.dart';

class ControlCenterScreen extends StatelessWidget {
  const ControlCenterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF000000),
              Color(0xFF0A0A0A),
              Color(0xFF000000),
            ],
          ),
        ),
        child: CustomScrollView(
          slivers: [
            // AppBar
            SliverAppBar(
              backgroundColor: Colors.black.withOpacity(0.8),
              floating: true,
              pinned: true,
              expandedHeight: 120.0,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(
                  'SEGURIDAD 24/7 ECUADOR',
                  style: GoogleFonts.inter(
                    color: const Color(0xFFD4AF37),
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    letterSpacing: 1.5,
                  ),
                ),
                centerTitle: true,
                background: Container(
                  color: Colors.black,
                  child: Center(
                    child: Opacity(
                      opacity: 0.1,
                      child: Image.asset(
                        'assets/logo.png',
                        width: 200,
                        errorBuilder: (context, error, stackTrace) => const Icon(
                          Icons.security,
                          size: 100,
                          color: Color(0xFFD4AF37),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 30),
                child: Column(
                  children: [
                    FadeInDown(
                      child: Text(
                        '24/7 CONTROL CENTER',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                          foreground: Paint()
                            ..shader = const LinearGradient(
                              colors: [
                                Color(0xFFD4AF37),
                                Color(0xFFF4D47C),
                                Color(0xFFD4AF37),
                              ],
                            ).createShader(const Rect.fromLTWH(0.0, 0.0, 200.0, 70.0)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 40),

                    // PUBLIC SECTION
                    const SectionHeader(
                      title: 'Acceso Público',
                      subtitle: 'Recursos y portales para residentes y visitantes',
                      icon: FontAwesomeIcons.globe,
                      color: Color(0xFF4287F5),
                    ),
                    const SizedBox(height: 20),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 15,
                      mainAxisSpacing: 15,
                      childAspectRatio: 0.9,
                      children: [
                        DashboardCard(
                          title: 'Tutoriales',
                          icon: FontAwesomeIcons.video,
                          color: const Color(0xFF4287F5),
                          badge: 'Público',
                          onTap: () => _launchURL('https://seguridad247ecuador.com/tutoriales.html'),
                        ),
                        DashboardCard(
                          title: 'Paga Aquí',
                          icon: FontAwesomeIcons.handHoldingDollar,
                          color: const Color(0xFF4287F5),
                          badge: 'Público',
                          onTap: () => _launchURL('https://seguridad247ecuador.com/portal_clientes.html'),
                        ),
                        DashboardCard(
                          title: 'Registro Residentes',
                          icon: FontAwesomeIcons.buildingUser,
                          color: const Color(0xFF4287F5),
                          badge: 'Público',
                          onTap: () => _showLoginDialog(context, 'Residentes'),
                        ),
                      ],
                    ),

                    const SizedBox(height: 60),

                    // INTERNAL SECTION
                    const SectionHeader(
                      title: 'Gestión Interna',
                      subtitle: 'Acceso exclusivo equipo Seguridad 24/7',
                      icon: FontAwesomeIcons.shieldHalved,
                      color: Color(0xFFD4AF37),
                    ),
                    const SizedBox(height: 20),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 15,
                      mainAxisSpacing: 15,
                      childAspectRatio: 0.9,
                      children: [
                        DashboardCard(
                          title: 'Administración',
                          icon: FontAwesomeIcons.userShield,
                          color: const Color(0xFFD4AF37),
                          badge: 'Interno',
                          onTap: () => _showLoginDialog(context, 'Administración'),
                        ),
                        DashboardCard(
                          title: 'Gestión Técnica',
                          icon: FontAwesomeIcons.screwdriverWrench,
                          color: const Color(0xFFD4AF37),
                          badge: 'Interno',
                          onTap: () => _showLoginDialog(context, 'Gestión Técnica'),
                        ),
                        DashboardCard(
                          title: 'Operaciones',
                          icon: FontAwesomeIcons.desktop,
                          color: const Color(0xFFD4AF37),
                          badge: 'Interno',
                          onTap: () => _showLoginDialog(context, 'Operaciones'),
                        ),
                        DashboardCard(
                          title: 'Comercial',
                          icon: FontAwesomeIcons.cartShopping,
                          color: const Color(0xFFD4AF37),
                          badge: 'Interno',
                          onTap: () => _showLoginDialog(context, 'Comercial'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 50),
                    
                    Text(
                      '© 2025 Seguridad 24/7 Ecuador',
                      style: GoogleFonts.inter(
                        color: Colors.white24,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _launchURL(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _showLoginDialog(BuildContext context, String portal) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF111111),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFD4AF37), width: 1),
        ),
        title: Row(
          children: [
            const Icon(FontAwesomeIcons.user, color: Color(0xFFD4AF37), size: 18),
            const SizedBox(width: 10),
            Text(
              'Login $portal',
              style: GoogleFonts.inter(
                color: const Color(0xFFD4AF37),
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Email',
                labelStyle: const TextStyle(color: Color(0xFFD4AF37)),
                enabledBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Colors.white24),
                  borderRadius: BorderRadius.circular(12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Color(0xFFD4AF37)),
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.email, color: Colors.white24),
              ),
            ),
            const SizedBox(height: 15),
            TextField(
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Contraseña',
                labelStyle: const TextStyle(color: Color(0xFFD4AF37)),
                enabledBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Colors.white24),
                  borderRadius: BorderRadius.circular(12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Color(0xFFD4AF37)),
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.lock, color: Colors.white24),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFD4AF37),
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('INGRESAR', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  const SectionHeader({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return FadeInLeft(
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.3), width: 2),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 24),
                const SizedBox(width: 15),
                Text(
                  title.toUpperCase(),
                  style: GoogleFonts.inter(
                    color: color,
                    fontWeight: FontWeight.w900,
                    fontSize: 20,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                color: color.withOpacity(0.7),
                fontSize: 12,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DashboardCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final String badge;
  final VoidCallback onTap;

  const DashboardCard({
    super.key,
    required this.title,
    required this.icon,
    required this.color,
    required this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ZoomIn(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withOpacity(0.05),
                Colors.white.withOpacity(0.02),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withOpacity(0.2), width: 1.5),
          ),
          child: Stack(
            children: [
              Positioned(
                top: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    badge,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, color: color, size: 40),
                    const SizedBox(height: 15),
                    Text(
                      title.toUpperCase(),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
