import 'package:flutter_test/flutter_test.dart';
import 'package:seguridad247_mobile/main.dart';

void main() {
  testWidgets('Control Center smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const Seguridad247App());

    // Verify that the title exists.
    expect(find.text('SEGURIDAD 24/7 ECUADOR'), findsOneWidget);
  });
}
