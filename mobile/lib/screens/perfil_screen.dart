import 'package:flutter/material.dart';
import '../models/perfil.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class PerfilScreen extends StatefulWidget {
  const PerfilScreen({super.key});

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> {
  late Future<Perfil> _futuro;

  @override
  void initState() {
    super.initState();
    _futuro = ApiService.meuPerfil();
  }

  String _iniciais(String nome) {
    final partes = nome.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (partes.isEmpty) return '?';
    if (partes.length == 1) return partes.first[0].toUpperCase();
    return (partes.first[0] + partes.last[0]).toUpperCase();
  }

  String _data(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Meu perfil')),
      body: FutureBuilder<Perfil>(
        future: _futuro,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            final erro = snap.error;
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    erro is ApiException
                        ? erro.mensagem
                        : 'Não foi possível conectar ao servidor',
                  ),
                  TextButton(
                    onPressed: () =>
                        setState(() => _futuro = ApiService.meuPerfil()),
                    child: const Text('Tentar de novo'),
                  ),
                ],
              ),
            );
          }

          final p = snap.data!;
          final alerta = p.vencido || (!p.semPlano && p.diasRestantes <= 7);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Center(
                child: CircleAvatar(
                  radius: 44,
                  backgroundColor: AppColors.vermelho,
                  foregroundColor: AppColors.branco,
                  child: Text(
                    _iniciais(p.nome),
                    style: const TextStyle(
                        fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  p.nome,
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 24),
              Card(
                color: AppColors.cinzaEscuro,
                child: Column(
                  children: [
                    _Linha(
                      icone: Icons.mail_outline,
                      rotulo: 'E-mail',
                      valor: p.email.isEmpty ? '—' : p.email,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Card(
                color: AppColors.cinzaEscuro,
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(
                        Icons.workspace_premium_outlined,
                        color: AppColors.vermelho,
                      ),
                      title: const Text(
                        'Plano atual',
                        style: TextStyle(color: AppColors.cinza, fontSize: 12),
                      ),
                      subtitle: Text(
                        p.plano ?? 'Sem plano',
                        style: const TextStyle(
                            color: AppColors.branco, fontSize: 16),
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2C2C2E),
                          border: Border.all(
                            color:
                                alerta ? AppColors.vermelho : AppColors.cinza,
                          ),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          p.situacao.toUpperCase(),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ),
                    _Linha(
                      icone: Icons.calendar_today_outlined,
                      rotulo: 'Vencimento',
                      valor: p.dataFim == null ? '—' : _data(p.dataFim!),
                    ),
                    _Linha(
                      icone: Icons.timer_outlined,
                      rotulo: 'Tempo restante',
                      valor: p.textoRestante,
                      cor: alerta ? AppColors.vermelho : AppColors.branco,
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Linha extends StatelessWidget {
  final IconData icone;
  final String rotulo;
  final String valor;
  final Color? cor;

  const _Linha({
    required this.icone,
    required this.rotulo,
    required this.valor,
    this.cor,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icone, color: AppColors.vermelho),
      title: Text(rotulo,
          style: const TextStyle(color: AppColors.cinza, fontSize: 12)),
      subtitle: Text(valor,
          style: TextStyle(color: cor ?? AppColors.branco, fontSize: 16)),
    );
  }
}
