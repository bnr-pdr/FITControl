import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import '../models/treino.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'login_screen.dart';
import 'perfil_screen.dart';

class TreinosScreen extends StatefulWidget {
  const TreinosScreen({super.key});

  @override
  State<TreinosScreen> createState() => _TreinosScreenState();
}

class _TreinosScreenState extends State<TreinosScreen>
    with WidgetsBindingObserver {
  late Future<List<Treino>> _treinosFuture;
  late Future<int> _checkinsFuture;

  String? _treinoSelecionadoNome;
  String? _proximoTreinoNome;
  String _ultimaDataVerificada = '';
  bool _checkinFeitoHoje = false;
  bool _fazendoCheckin = false;
  bool _estadoCarregado = false;
  final Map<String, Set<int>> _feitosPorTreino = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ultimaDataVerificada = _dataHoje;
    _carregar();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _dataHoje != _ultimaDataVerificada) {
      _ultimaDataVerificada = _dataHoje;
      setState(_carregar);
    }
  }

  String get _dataHoje {
    final agora = DateTime.now();
    final m = agora.month.toString().padLeft(2, '0');
    final d = agora.day.toString().padLeft(2, '0');
    return '${agora.year}-$m-$d';
  }

  File get _arquivoProgresso {
    final chave = ApiService.nomeUsuario
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]'), '_');
    final pasta = Directory.systemTemp.parent;
    return File('${pasta.path}/fitcontrol_progresso_$chave.json');
  }

  Future<void> _carregarProgressoLocal(List<Treino> treinos) async {
    if (_estadoCarregado || treinos.isEmpty) return;
    _estadoCarregado = true;

    try {
      final arquivo = _arquivoProgresso;
      if (!await arquivo.exists()) {
        _treinoSelecionadoNome = treinos.first.nome;
        _proximoTreinoNome = treinos.first.nome;
        await _salvarProgressoLocal();
        return;
      }

      final dados =
          jsonDecode(await arquivo.readAsString()) as Map<String, dynamic>;
      final dataSalva = (dados['data'] ?? '').toString();
      final salvoAtual = dados['treinoAtual']?.toString();
      final salvoProximo = dados['proximoTreino']?.toString();

      if (dataSalva == _dataHoje) {
        _feitosPorTreino.clear();
        final feitosJson = dados['feitos'];
        if (feitosJson is Map) {
          feitosJson.forEach((k, v) {
            if (v is List) {
              _feitosPorTreino[k.toString()] =
                  v.map((e) => (e as num).toInt()).toSet();
            }
          });
        }
        _treinoSelecionadoNome = treinos.any((t) => t.nome == salvoAtual)
            ? salvoAtual
            : treinos.first.nome;
        _proximoTreinoNome = treinos.any((t) => t.nome == salvoProximo)
            ? salvoProximo
            : _treinoSelecionadoNome;
      } else {
        _feitosPorTreino.clear();
        final alvo = treinos.any((t) => t.nome == salvoProximo)
            ? salvoProximo!
            : treinos.first.nome;
        _treinoSelecionadoNome = alvo;
        _proximoTreinoNome = alvo;
        await _salvarProgressoLocal();
      }
    } catch (_) {
      _treinoSelecionadoNome = treinos.first.nome;
      _proximoTreinoNome = treinos.first.nome;
    }
  }

  Future<void> _salvarProgressoLocal() async {
    try {
      final feitosSerializados = <String, List<int>>{};
      _feitosPorTreino.forEach((k, v) {
        feitosSerializados[k] = v.toList()..sort();
      });

      final payload = {
        'data': _dataHoje,
        'treinoAtual': _treinoSelecionadoNome,
        'proximoTreino': _proximoTreinoNome,
        'feitos': feitosSerializados,
      };
      await _arquivoProgresso.writeAsString(jsonEncode(payload));
    } catch (_) {}
  }

  void _selecionarTreino(String nomeTreino) {
    setState(() {
      _treinoSelecionadoNome = nomeTreino;
    });
    _salvarProgressoLocal();
  }

  void _alternarExercicio(
      List<Treino> treinos, Treino treinoAtual, int indexEx) {
    setState(() {
      final feitos =
          _feitosPorTreino.putIfAbsent(treinoAtual.nome, () => <int>{});
      if (feitos.contains(indexEx)) {
        feitos.remove(indexEx);
      } else {
        feitos.add(indexEx);
      }

      final totalEx = treinoAtual.exercicios.length;
      if (totalEx > 0 && feitos.length == totalEx) {
        final idxAtual = treinos.indexWhere((t) => t.nome == treinoAtual.nome);
        final idxProximo = (idxAtual + 1) % treinos.length;
        _proximoTreinoNome = treinos[idxProximo].nome;
      } else {
        _proximoTreinoNome = treinoAtual.nome;
      }
    });
    _salvarProgressoLocal();
  }

  void _carregar() {
    _estadoCarregado = false;
    final hoje = _dataHoje;
    _ultimaDataVerificada = hoje;

    _treinosFuture = ApiService.meusTreinos().then((lista) async {
      await _carregarProgressoLocal(lista);
      return lista;
    });
    _checkinsFuture = ApiService.checkinsDoMes().catchError((_) => 0);
    ApiService.checkinFeitoHoje(hoje).then((feito) {
      if (mounted) setState(() => _checkinFeitoHoje = feito);
    }).catchError((_) {});
  }

  Future<void> _realizarCheckinDireto() async {
    if (_fazendoCheckin || _checkinFeitoHoje) return;
    setState(() => _fazendoCheckin = true);
    try {
      final msg = await ApiService.fazerCheckin(_dataHoje);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg)),
      );
      setState(() {
        _checkinFeitoHoje = true;
        _checkinsFuture = ApiService.checkinsDoMes().catchError((_) => 0);
      });
    } catch (e) {
      if (!mounted) return;
      final msg = e is ApiException
          ? e.mensagem
          : 'Não foi possível registrar o check-in.';
      if (msg.toLowerCase().contains('duplicado') ||
          msg.toLowerCase().contains('hoje')) {
        setState(() => _checkinFeitoHoje = true);
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    } finally {
      if (mounted) setState(() => _fazendoCheckin = false);
    }
  }

  String _resumoGrupos(Treino t) {
    final grupos = t.exercicios
        .map((e) => e.grupoMuscular.trim())
        .where((g) => g.isNotEmpty)
        .toSet()
        .toList();
    if (grupos.isEmpty) return '${t.exercicios.length} exercícios';
    return grupos.take(2).join(' · ');
  }

  void _sair() {
    ApiService.sair();
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primeiroNome = ApiService.nomeUsuario.trim().isEmpty
        ? 'Aluno'
        : ApiService.nomeUsuario.trim().split(' ').first;

    return Scaffold(
      appBar: AppBar(
        title: Text('Olá, $primeiroNome'),
        actions: [
          IconButton(
            tooltip: 'Meu perfil',
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PerfilScreen()),
            ),
          ),
          IconButton(
            tooltip: 'Sair',
            icon: const Icon(Icons.logout),
            onPressed: _sair,
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.vermelho,
        onRefresh: () async {
          setState(_carregar);
          await _treinosFuture.catchError((_) => <Treino>[]);
        },
        child: FutureBuilder<List<Treino>>(
          future: _treinosFuture,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              final erro = snap.error;
              return ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  const SizedBox(height: 80),
                  Center(
                    child: Text(
                      erro is ApiException
                          ? erro.mensagem
                          : 'Não foi possível conectar ao servidor',
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: TextButton(
                      onPressed: () => setState(_carregar),
                      child: const Text('Tentar de novo'),
                    ),
                  ),
                ],
              );
            }

            final treinos = snap.data!;
            Treino? treinoAtual;
            if (treinos.isNotEmpty) {
              treinoAtual = treinos.firstWhere(
                (t) => t.nome == _treinoSelecionadoNome,
                orElse: () => treinos.first,
              );
            }

            final feitos = treinoAtual == null
                ? <int>{}
                : _feitosPorTreino.putIfAbsent(treinoAtual.nome, () => <int>{});
            final totalEx = treinoAtual?.exercicios.length ?? 0;
            final progresso = totalEx == 0 ? 0.0 : feitos.length / totalEx;
            final treinoConcluidoHoje = totalEx > 0 && feitos.length == totalEx;

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                // 1. Cartão de Frequência + Botão de Check-in Diário
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.cinzaEscuro,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _checkinFeitoHoje
                          ? Colors.green.shade600
                          : AppColors.vermelho,
                    ),
                  ),
                  child: Column(
                    children: [
                      FutureBuilder<int>(
                        future: _checkinsFuture,
                        builder: (context, freqSnap) {
                          final total = freqSnap.data ?? 0;
                          return Row(
                            children: [
                              const Icon(
                                Icons.local_fire_department,
                                color: AppColors.vermelho,
                                size: 32,
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '$total',
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const Text(
                                    'check-ins neste mês',
                                    style: TextStyle(color: AppColors.cinza),
                                  ),
                                ],
                              ),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: 14),
                      ElevatedButton.icon(
                        style: _checkinFeitoHoje
                            ? ElevatedButton.styleFrom(
                                disabledBackgroundColor: Colors.green.shade800
                                    .withValues(alpha: 0.45),
                                disabledForegroundColor: Colors.green.shade200,
                              )
                            : null,
                        onPressed: (_fazendoCheckin || _checkinFeitoHoje)
                            ? null
                            : _realizarCheckinDireto,
                        icon: _fazendoCheckin
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.branco,
                                ),
                              )
                            : Icon(
                                _checkinFeitoHoje
                                    ? Icons.check_circle
                                    : Icons.check_circle_outline,
                              ),
                        label: Text(
                          _checkinFeitoHoje
                              ? 'CHECK-IN FEITO HOJE'
                              : (_fazendoCheckin
                                  ? 'REGISTRANDO...'
                                  : 'FAZER CHECK-IN'),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // 2. Seção de Treinos com Seletor A / B / C e Rotação Automática
                const Text(
                  'Meus Treinos',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Selecione qual treino você vai realizar agora:',
                  style: TextStyle(color: AppColors.cinza, fontSize: 13),
                ),
                const SizedBox(height: 12),

                if (treinos.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 32),
                    child: Center(
                      child: Text(
                        'Seu professor ainda não cadastrou treinos.',
                        style: TextStyle(color: AppColors.cinza),
                      ),
                    ),
                  )
                else ...[
                  SizedBox(
                    height: 76,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: treinos.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        final t = treinos[index];
                        final ativo = treinoAtual?.nome == t.nome;
                        return GestureDetector(
                          onTap: () => _selecionarTreino(t.nome),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            width: 155,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: ativo
                                  ? AppColors.vermelho
                                  : AppColors.cinzaEscuro,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: ativo
                                    ? AppColors.branco
                                    : const Color(0xFF2E2E30),
                                width: ativo ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      t.nome,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: AppColors.branco,
                                      ),
                                    ),
                                    if (ativo)
                                      const Icon(
                                        Icons.check_circle,
                                        size: 16,
                                        color: AppColors.branco,
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _resumoGrupos(t),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: ativo
                                        ? AppColors.branco
                                            .withValues(alpha: 0.9)
                                        : AppColors.cinza,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (treinoAtual != null) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.cinzaEscuro,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.vermelho,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'ATUAL: ${treinoAtual.nome.toUpperCase()}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _resumoGrupos(treinoAtual),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (treinoAtual.professor != null &&
                              treinoAtual.professor!.trim().isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Professor: ${treinoAtual.professor}',
                              style: const TextStyle(
                                color: AppColors.cinza,
                                fontSize: 12,
                              ),
                            ),
                          ],
                          if (treinoAtual.observacao != null &&
                              treinoAtual.observacao!.trim().isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Obs.: ${treinoAtual.observacao}',
                              style: const TextStyle(
                                color: AppColors.cinza,
                                fontSize: 12,
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: progresso,
                              minHeight: 8,
                              backgroundColor: const Color(0xFF2A2A2A),
                              color: treinoConcluidoHoje
                                  ? Colors.green.shade500
                                  : AppColors.vermelho,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${feitos.length} de $totalEx exercícios concluídos',
                            style: const TextStyle(
                              color: AppColors.cinza,
                              fontSize: 12,
                            ),
                          ),
                          if (treinoConcluidoHoje &&
                              _proximoTreinoNome != null &&
                              treinos.length > 1) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Treino concluído hoje! Amanhã o app avançará para $_proximoTreinoNome.',
                              style: TextStyle(
                                color: Colors.green.shade300,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (treinoAtual.exercicios.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(
                          child: Text(
                            'Nenhum exercício cadastrado neste treino.',
                            style: TextStyle(color: AppColors.cinza),
                          ),
                        ),
                      )
                    else
                      for (int i = 0; i < treinoAtual.exercicios.length; i++)
                        _CardExercicio(
                          exercicio: treinoAtual.exercicios[i],
                          concluido: feitos.contains(i),
                          onTap: () =>
                              _alternarExercicio(treinos, treinoAtual!, i),
                        ),
                  ],
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _CardExercicio extends StatelessWidget {
  final Exercicio exercicio;
  final bool concluido;
  final VoidCallback onTap;

  const _CardExercicio({
    required this.exercicio,
    required this.concluido,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.cinzaEscuro,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: concluido ? AppColors.vermelho : Colors.transparent,
        ),
      ),
      child: ListTile(
        leading: Icon(
          concluido ? Icons.check_circle : Icons.circle_outlined,
          color: concluido ? AppColors.vermelho : AppColors.cinza,
        ),
        title: Text(
          exercicio.nome,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            decoration: concluido ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: Text(
          '${exercicio.series} séries · ${exercicio.repeticoes} reps \n'
          '${exercicio.grupoMuscular} · descanso ${exercicio.descansoSeg}s',
          style: const TextStyle(color: AppColors.cinza),
        ),
        isThreeLine: true,
        onTap: onTap,
      ),
    );
  }
}
