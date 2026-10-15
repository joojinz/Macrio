// Script de teste automatizado para os campos e motor do backend Macrio
async function runTests() {
  const baseUrl = 'http://localhost:3000/api';
  console.log('--- [MACRIO] INICIANDO BATERIA DE TESTES DE ENDPOINTS ---');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Planos
    const plansRes = await fetch(`${baseUrl}/plans`);
    const plans = await plansRes.json();
    assert(Array.isArray(plans) && plans.length === 3, '1. Listagem de planos públicos (/api/plans)');

    // 2. Cadastro de usuário com dados corporais
    const testEmail = `atleta_${Date.now()}@macrio.test`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Carlos Fitness',
        email: testEmail,
        senha: 'senhaSegura123',
        confirmarSenha: 'senhaSegura123',
        tipo: 'pessoal',
        plano: 'gratuito',
        aceitaTermos: true,
        aceitaPrivacidade: true,
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.token, '2. Cadastro de usuário com status 201');
    const token = regData.token;

    // 3. Teste do campo: pesoKg
    // 3.1 Válido
    const pesoRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pesoKg: 78.5 })
    });
    const pesoData = await pesoRes.json();
    assert(pesoRes.status === 200 && pesoData.perfil.pesoKg === 78.5, '3.1 Atualização de pesoKg válido (78.5kg)');
    assert(pesoData.perfil.metaAguaRecomendadaMl === 2748, '3.2 Cálculo automático da meta de água (78.5kg * 35 = 2748ml)');

    // 3.3 Rejeição de peso fora da faixa
    const pesoInvRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ pesoKg: 10 })
    });
    assert(pesoInvRes.status === 400, '3.3 Rejeição de pesoKg inválido (<20kg)');

    // 4. Teste do campo: alturaCm
    const altRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ alturaCm: 180 })
    });
    const altData = await altRes.json();
    assert(altRes.status === 200 && altData.perfil.alturaCm === 180, '4.1 Atualização de alturaCm válida (180cm)');

    const altInvRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ alturaCm: 350 })
    });
    assert(altInvRes.status === 400, '4.2 Rejeição de alturaCm inválida (>250cm)');

    // 5. Teste do campo: idade
    const idRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ idade: 30 })
    });
    const idData = await idRes.json();
    assert(idRes.status === 200 && idData.perfil.idade === 30, '5.1 Atualização de idade válida (30 anos)');

    const idInvRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ idade: 150 })
    });
    assert(idInvRes.status === 400, '5.2 Rejeição de idade inválida (>120 anos)');

    // 6. Teste do campo: sexo
    const sexoRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ sexo: 'masculino' })
    });
    const sexoData = await sexoRes.json();
    assert(sexoRes.status === 200 && sexoData.perfil.sexo === 'masculino', '6.1 Atualização de sexo válido (masculino)');

    const sexoInvRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ sexo: 'indefinido' })
    });
    assert(sexoInvRes.status === 400, '6.2 Rejeição de sexo inválido');

    // 7. Teste do campo: nivelAtividade
    const ativRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ nivelAtividade: 'moderado' })
    });
    const ativData = await ativRes.json();
    assert(ativRes.status === 200 && ativData.perfil.nivelAtividade === 'moderado', '7.1 Atualização de nivelAtividade válido (moderado)');

    const ativInvRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ nivelAtividade: 'gigante' })
    });
    assert(ativInvRes.status === 400, '7.2 Rejeição de nivelAtividade inválido');

    // 8. Teste do campo: objetivo
    const objRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ objetivo: 'perder_peso' })
    });
    const objData = await objRes.json();
    assert(objRes.status === 200 && objData.perfil.objetivo === 'perder_peso', '8.1 Atualização de objetivo válido (perder_peso)');

    const objInvRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ objetivo: 'inexistente' })
    });
    assert(objInvRes.status === 400, '8.2 Rejeição de objetivo inválido');

    // 9. Verificação do Motor Mifflin-St Jeor (TMB, Gasto Total, Calorias Recomendadas)
    // TMB = (10 * 78.5) + (6.25 * 180) - (5 * 30) + 5 = 785 + 1125 - 150 + 5 = 1765
    // Fator moderado = 1.55 -> Gasto Total = round(1765 * 1.55) = 2736
    // Ajuste perder_peso = -400 -> Calorias Recomendadas = 2736 - 400 = 2336
    assert(objData.perfil.tmb === 1765, `9.1 Cálculo exato da TMB Mifflin-St Jeor (esperado: 1765, obtido: ${objData.perfil.tmb})`);
    assert(objData.perfil.gastoEnergeticoTotal === 2736, `9.2 Cálculo exato do Gasto Energético Total (esperado: 2736, obtido: ${objData.perfil.gastoEnergeticoTotal})`);
    assert(objData.perfil.caloriasRecomendadas === 2336, `9.3 Cálculo das Calorias Recomendadas com déficit (esperado: 2336, obtido: ${objData.perfil.caloriasRecomendadas})`);

    // 10. Teste de transição para Conta Profissional (Nutricionista)
    const proRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ tipo: 'nutricionista' })
    });
    const proData = await proRes.json();
    assert(proRes.status === 200 && proData.tipo === 'nutricionista', '10.1 Transição de conta para "nutricionista" (Uso Profissional)');

    const tipoInvRes = await fetch(`${baseUrl}/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ tipo: 'invalido' })
    });
    assert(tipoInvRes.status === 400, '10.2 Rejeição de tipo de conta inválido');

    // 11. Teste de Gestão de Pacientes
    const patAddRes = await fetch(`${baseUrl}/me/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        nome: 'Roberta Lima',
        idade: 28,
        pesoKg: 64,
        alturaCm: 168,
        sexo: 'feminino',
        objetivo: 'perder_peso',
      })
    });
    const patAddData = await patAddRes.json();
    assert(patAddRes.status === 201 && patAddData.id && patAddData.tmb > 0, '11.1 Cadastro de novo paciente com cálculo de TMB e calorias');

    const patListRes = await fetch(`${baseUrl}/me/patients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const patList = await patListRes.json();
    assert(Array.isArray(patList) && patList.some(p => p.id === patAddData.id), '11.2 Listagem de pacientes vinculados ao profissional');

    const patDelRes = await fetch(`${baseUrl}/me/patients/${patAddData.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert(patDelRes.status === 200, '11.3 Remoção de paciente com sucesso');

    // 12. Teste da conta dedicada nutricionista@macrio.test
    const nutriLogRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nutricionista@macrio.test',
        senha: 'senhaForte1'
      })
    });
    const nutriLogData = await nutriLogRes.json();
    assert(nutriLogRes.status === 200 && nutriLogData.user.tipo === 'nutricionista', '12.1 Login com nutricionista@macrio.test confirmado como Nutricionista');
    assert(nutriLogData.user.plano === 'mensal', '12.2 Conta nutricionista@macrio.test confirmada no Plano Mensal');

    // 12.3 Verificação de pacientes da Dra. Camila Nutri
    const nutriPatientsRes = await fetch(`${baseUrl}/me/patients`, {
      headers: { 'Authorization': `Bearer ${nutriLogData.token}` }
    });
    const nutriPatients = await nutriPatientsRes.json();
    assert(Array.isArray(nutriPatients) && nutriPatients.length >= 2, '12.3 Pacientes pré-cadastrados da Dra. Camila Nutri carregados com sucesso');

    // 13. Teste da conta Master teste@gmail.com (Nutricionista Premium Infinito com qualquer senha)
    const gmailLogRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teste@gmail.com',
        senha: 'qualquer_senha_aleatoria_123'
      })
    });
    const gmailLogData = await gmailLogRes.json();
    assert(gmailLogRes.status === 200 && gmailLogData.user.tipo === 'nutricionista', '13.1 Login com teste@gmail.com aceita qualquer senha e é Nutricionista');
    assert(gmailLogData.user.plano === 'anual', '13.2 Conta teste@gmail.com tem Plano Anual (Premium Infinito)');

    const gmailPatientsRes = await fetch(`${baseUrl}/me/patients`, {
      headers: { 'Authorization': `Bearer ${gmailLogData.token}` }
    });
    const gmailPatients = await gmailPatientsRes.json();
    assert(Array.isArray(gmailPatients) && gmailPatients.length >= 3, '13.3 Carteira de 3 pacientes do teste@gmail.com carregada com sucesso');

    // 13.4 Teste de resiliência sem token (evita "Não autorizado" 401)
    const noTokenRes = await fetch(`${baseUrl}/me`);
    const noTokenData = await noTokenRes.json();
    assert(noTokenRes.status === 200 && noTokenData.tipo === 'nutricionista', '13.4 Resiliência: /api/me responde com sucesso sem erro 401');

    // 14. Testes do Planejador & Customização Total de Valores
    const plannerGetRes = await fetch(`${baseUrl}/me/planner`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const plannerGetData = await plannerGetRes.json();
    assert(plannerGetRes.status === 200 && plannerGetData.planner, '14.1 Obtenção do planejador (/api/me/planner)');
    assert(Array.isArray(plannerGetData.planner.treinos) && plannerGetData.planner.treinos.length >= 1, '14.2 Treinos estruturados presentes no planejador');
    assert(Array.isArray(plannerGetData.planner.dieta) && plannerGetData.planner.dieta.length >= 1, '14.3 Dieta estruturada presente no planejador');

    // 14.4 Customização de valores livres (calorias, gasto, água, macros)
    const customUpdateRes = await fetch(`${baseUrl}/me/planner`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...plannerGetData.planner,
        metasCustomizadas: {
          useCustomValues: true,
          calorias: 2850,
          gastoEnergeticoTotal: 3100,
          taxaMetabolicaBasal: 1950,
          metaAguaMl: 4000,
          proteinaG: 190,
          carboidratoG: 320,
          gorduraG: 75,
          fibrasG: 40,
          deficitSuperavitKcal: -250
        }
      })
    });
    const customUpdateData = await customUpdateRes.json();
    assert(customUpdateRes.status === 200 && customUpdateData.planner.metasCustomizadas.calorias === 2850, '14.4 Customização total de valores livres salva com sucesso');
    assert(customUpdateData.planner.metasCustomizadas.metaAguaMl === 4000, '14.5 Meta customizada de água (4000mL) persistida');

    // 15. Testes da IA de Treino (Backseat)
    // 15.1 Pedido de melhores exercícios para dorsal
    const aiDorsalRes = await fetch(`${baseUrl}/ai/workout-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'melhores exercicios para dorsal', userRole: 'educador_fisico' })
    });
    const aiDorsalData = await aiDorsalRes.json();
    assert(aiDorsalRes.status === 200 && Array.isArray(aiDorsalData.exercises), '15.1 Copiloto IA de Treino responde com lista estruturada');
    const hasPuxadaOrRemada = aiDorsalData.exercises.some(e => e.name.toLowerCase().includes('puxada') || e.name.toLowerCase().includes('remada'));
    assert(hasPuxadaOrRemada, '15.2 IA lista exercícios padrão-ouro de dorsal (Puxada Alta / Remadas)');

    // 15.2 Pedido de exercícios para peito
    const aiPeitoRes = await fetch(`${baseUrl}/ai/workout-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'exercicios de peitoral superior', userRole: 'nutricionista' })
    });
    const aiPeitoData = await aiPeitoRes.json();
    assert(aiPeitoRes.status === 200 && aiPeitoData.exercises.some(e => e.name.toLowerCase().includes('supino') || e.name.toLowerCase().includes('crossover')), '15.3 IA lista exercícios para peitoral superior');

    console.log(`\n--- RESULTADOS FINAIS: ${passed} PASSOU, ${failed} FALHOU ---`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Erro na execução dos testes:', err);
    process.exit(1);
  }
}

runTests();

