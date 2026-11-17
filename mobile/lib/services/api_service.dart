import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/perfil.dart';
import '../models/treino.dart';

class ApiException implements Exception {
  final String mensagem;
  ApiException(this.mensagem);
  @override
  String toString() => mensagem;
}

class ApiService {
  // Emulador Android: 10.0.2.2 aponta para o localhost do PC
  // Para celular físico na mesma rede Wi-Fi, rode com:
  // flutter run --dart-define=API_URL=http://SEU_IP_LOCAL:8080/api
  static const baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:8080/api',
  );
  static const _limite = Duration(seconds: 10);

  static String? _token;
  static String nomeUsuario = '';
  static String emailUsuario = '';

  static void Function()? aoExpirar;

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  static String _erro(http.Response r) {
    try {
      final corpo = jsonDecode(r.body);
      return (corpo['erro'] ?? corpo['message'] ?? 'Erro ${r.statusCode}')
          .toString();
    } catch (_) {
      return 'Erro ${r.statusCode}';
    }
  }

  static void sair() {
    _token = null;
    nomeUsuario = '';
    emailUsuario = '';
  }

  static dynamic _tratar(http.Response r) {
    if (r.statusCode == 403) {
      aoExpirar?.call();
      throw ApiException('Sessão expirada. Entre novamente.');
    }
    if (r.statusCode < 200 || r.statusCode >= 300) {
      throw ApiException(_erro(r));
    }
    if (r.body.isEmpty) return {};
    return jsonDecode(r.body);
  }

  static Future<dynamic> _get(String caminho) async {
    final r = await http
        .get(Uri.parse('$baseUrl$caminho'), headers: _headers)
        .timeout(_limite);
    return _tratar(r);
  }

  static Future<dynamic> _post(
      String caminho, Map<String, dynamic> corpo) async {
    final r = await http
        .post(
          Uri.parse('$baseUrl$caminho'),
          headers: _headers,
          body: jsonEncode(corpo),
        )
        .timeout(_limite);
    return _tratar(r);
  }

  // ---------- Autenticação (mesma rota da Web) ----------

  static Future<void> login(String email, String senha) async {
    final r = await http
        .post(
          Uri.parse('$baseUrl/auth/login'),
          headers: _headers,
          body:
              jsonEncode({'email': email.trim().toLowerCase(), 'senha': senha}),
        )
        .timeout(_limite);
    if (r.statusCode != 200) throw ApiException(_erro(r));

    final corpo = jsonDecode(r.body);
    if (corpo['perfil']?.toString().toLowerCase() != 'aluno') {
      throw ApiException('Este aplicativo é exclusivo para alunos.');
    }
    _token = corpo['token'];
    nomeUsuario = (corpo['nome'] ?? '').toString();
    emailUsuario = (corpo['email'] ?? email).toString();
  }

  // ---------- Dados do Aluno ----------

  static Future<Perfil> meuPerfil() async {
    final dados = await _get('/mobile/meu-plano') as Map<String, dynamic>;
    return Perfil.fromJson(dados, emailFallback: emailUsuario);
  }

  static Future<List<Treino>> meusTreinos() async {
    final dados = await _get('/mobile/meus-treinos') as List;
    return Treino.agruparLinhas(dados);
  }

  static Future<int> checkinsDoMes() async {
    final dados = await _get('/mobile/frequencia') as List;
    final agora = DateTime.now();
    final prefixo = '${agora.year}-${agora.month.toString().padLeft(2, '0')}';
    for (final l in dados) {
      if (l['mes'].toString().startsWith(prefixo)) {
        return (l['total_checkins'] as num).toInt();
      }
    }
    return 0;
  }

  // Check-in
  static String _hojeFormatado() {
    final agora = DateTime.now();
    final m = agora.month.toString().padLeft(2, '0');
    final d = agora.day.toString().padLeft(2, '0');
    return '${agora.year}-$m-$d';
  }

  static Future<bool> checkinFeitoHoje([String? data]) async {
    final dia = data ?? _hojeFormatado();
    final r = await _get('/mobile/checkin-hoje?data=$dia');
    return r['feitoHoje'] == true;
  }

  static Future<String> fazerCheckin([String? data]) async {
    final dia = data ?? _hojeFormatado();
    final r = await _post('/mobile/checkin', {'metodo': 'botao', 'data': dia});
    return (r['mensagem'] ?? 'Check-in realizado!').toString();
  }
}
