class Perfil {
  final String nome;
  final String email;
  final String? plano;
  final String situacao; // ativa, vencida, sem_matricula
  final DateTime? dataFim;
  final int? diasRestantesApi;

  const Perfil({
    required this.nome,
    required this.email,
    this.plano,
    required this.situacao,
    this.dataFim,
    this.diasRestantesApi,
  });

  // Alinhado com a view vw_aluno_plano retornada por GET /api/mobile/meu-plano
  factory Perfil.fromJson(Map<String, dynamic> j,
          {String emailFallback = ''}) =>
      Perfil(
        nome: (j['nome'] ?? '').toString(),
        email: (j['email'] ?? emailFallback).toString(),
        plano: j['plano']?.toString(),
        situacao: (j['situacao'] ?? 'sem_matricula').toString(),
        dataFim: j['data_vencimento'] == null
            ? null
            : DateTime.parse(j['data_vencimento'].toString()),
        diasRestantesApi: (j['dias_restantes'] as num?)?.toInt(),
      );

  bool get semPlano => dataFim == null || situacao == 'sem_matricula';

  int get diasRestantes {
    if (diasRestantesApi != null) return diasRestantesApi!;
    final hoje = DateTime.now();
    final dia = DateTime(hoje.year, hoje.month, hoje.day);
    final fim = DateTime(dataFim!.year, dataFim!.month, dataFim!.day);
    return fim.difference(dia).inDays;
  }

  bool get vencido => !semPlano && (situacao == 'vencida' || diasRestantes < 0);

  String get textoRestante {
    if (semPlano) return 'Sem plano ativo';
    if (vencido) return 'Plano vencido';
    if (diasRestantes == 0) return 'Vence hoje';
    if (diasRestantes == 1) return '1 dia restante';
    return '$diasRestantes dias restantes';
  }
}
