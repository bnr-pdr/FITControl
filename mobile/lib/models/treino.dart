class Exercicio {
  final String nome;
  final String grupoMuscular;
  final int series;
  final String repeticoes;
  final double? cargaKg;
  final int descansoSeg;

  const Exercicio({
    required this.nome,
    required this.grupoMuscular,
    required this.series,
    required this.repeticoes,
    required this.cargaKg,
    required this.descansoSeg,
  });

  String get carga {
    final c = cargaKg;
    if (c == null) return 'sem carga';
    return '${c == c.roundToDouble() ? c.toInt() : c} kg';
  }
}

class Treino {
  final int id;
  final String nome; // Ex.: Treino A, Treino B, Treino C
  final int? diaSemana;
  final String? observacao;
  final String? professor;
  final List<Exercicio> exercicios;

  const Treino({
    required this.id,
    required this.nome,
    this.diaSemana,
    this.observacao,
    this.professor,
    required this.exercicios,
  });

  bool get ehHoje =>
      diaSemana != null && diaSemana == DateTime.now().weekday % 7;

  // Gera automaticamente o resumo dos grupos musculares do treino (ex.: "Peito e Tríceps")
  String get resumoGrupos {
    final grupos = <String>[];
    for (final e in exercicios) {
      final g = e.grupoMuscular.trim();
      if (g.isEmpty) continue;
      final capitalizado = g[0].toUpperCase() + g.substring(1).toLowerCase();
      if (!grupos.contains(capitalizado)) {
        grupos.add(capitalizado);
      }
    }
    if (grupos.isEmpty) return 'Geral';
    if (grupos.length == 1) return grupos.first;
    if (grupos.length == 2) return '${grupos[0]} e ${grupos[1]}';
    return '${grupos.sublist(0, grupos.length - 1).join(', ')} e ${grupos.last}';
  }

  // Agrupa as linhas de exercícios por treino (ou por nome A/B/C para evitar duplicatas)
  static List<Treino> agruparLinhas(List<dynamic> linhas) {
    final porChave = <String, Treino>{};
    for (final l in linhas) {
      final nomeTreino = (l['treino'] ?? 'Treino').toString().trim();
      final id = (l['treino_id'] as num?)?.toInt() ?? nomeTreino.hashCode;
      final treino = porChave.putIfAbsent(
        nomeTreino.toLowerCase(),
        () => Treino(
          id: id,
          nome: nomeTreino,
          diaSemana: (l['dia_semana'] as num?)?.toInt(),
          observacao: l['observacao']?.toString(),
          professor: l['professor']?.toString(),
          exercicios: <Exercicio>[],
        ),
      );
      if (l['exercicio'] != null) {
        treino.exercicios.add(Exercicio(
          nome: l['exercicio'].toString(),
          grupoMuscular: (l['grupo_muscular'] ?? '').toString(),
          series: (l['series'] as num?)?.toInt() ?? 3,
          repeticoes: (l['repeticoes'] ?? '12').toString(),
          cargaKg: (l['carga_kg'] as num?)?.toDouble(),
          descansoSeg: (l['descanso_seg'] as num?)?.toInt() ?? 60,
        ));
      }
    }
    final lista = porChave.values.toList();
    lista.sort((a, b) => a.nome.compareTo(b.nome));
    return lista;
  }
}
