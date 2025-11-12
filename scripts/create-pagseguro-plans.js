/**
 * Script Helper - Criar Planos PagSeguro
 * 
 * Este script cria automaticamente os planos de assinatura no PagSeguro
 * para os planos Premium e Family (mensal e anual)
 * 
 * Uso:
 * 1. npm install axios xml2js
 * 2. Edite as credenciais abaixo
 * 3. node scripts/create-pagseguro-plans.js
 */

const axios = require('axios');
const xml2js = require('xml2js');

// ============================================
// CONFIGURAÇÃO - EDITE AQUI!
// ============================================
const PAGSEGURO_EMAIL = 'seu-email@sandbox.pagseguro.com.br';
const PAGSEGURO_TOKEN = 'SEU_TOKEN_AQUI';
const USE_SANDBOX = true; // false para produção

// ============================================
// URLs
// ============================================
const SANDBOX_URL = 'https://ws.sandbox.pagseguro.uol.com.br/pre-approvals/request';
const PRODUCTION_URL = 'https://ws.pagseguro.uol.com.br/pre-approvals/request';
const BASE_URL = USE_SANDBOX ? SANDBOX_URL : PRODUCTION_URL;

// ============================================
// PLANOS
// ============================================
const PLANS = [
  {
    reference: 'PREMIUM_MONTHLY',
    name: 'Medicamenta.me Premium Mensal',
    description: 'Plano Premium com medicamentos ilimitados e IA',
    charge: 'AUTO',
    period: 'MONTHLY',
    amount: '29.90',
    maxAmount: '358.80', // 29.90 * 12 meses
    trialPeriodDuration: '7' // 7 dias grátis
  },
  {
    reference: 'PREMIUM_YEARLY',
    name: 'Medicamenta.me Premium Anual',
    description: 'Plano Premium anual com 17% de desconto',
    charge: 'AUTO',
    period: 'MONTHLY',
    amount: '24.90',
    maxAmount: '298.80', // 24.90 * 12 meses
    trialPeriodDuration: '7'
  },
  {
    reference: 'FAMILY_MONTHLY',
    name: 'Medicamenta.me Família Mensal',
    description: 'Plano Família completo com dependentes ilimitados',
    charge: 'AUTO',
    period: 'MONTHLY',
    amount: '49.90',
    maxAmount: '598.80', // 49.90 * 12 meses
    trialPeriodDuration: '7'
  },
  {
    reference: 'FAMILY_YEARLY',
    name: 'Medicamenta.me Família Anual',
    description: 'Plano Família anual com 17% de desconto',
    charge: 'AUTO',
    period: 'MONTHLY',
    amount: '41.60',
    maxAmount: '499.20', // 41.60 * 12 meses
    trialPeriodDuration: '7'
  }
];

// ============================================
// FUNÇÕES
// ============================================

/**
 * Cria um plano no PagSeguro
 */
async function createPlan(planData) {
  console.log(`\n📝 Criando plano: ${planData.name}...`);
  
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<preApprovalRequest>
  <reference>${planData.reference}</reference>
  <name>${planData.name}</name>
  <details>${planData.description}</details>
  <charge>${planData.charge}</charge>
  <period>${planData.period}</period>
  <amountPerPayment>${planData.amount}</amountPerPayment>
  <maxTotalAmount>${planData.maxAmount}</maxTotalAmount>
  <trialPeriodDuration>${planData.trialPeriodDuration}</trialPeriodDuration>
</preApprovalRequest>`;

  try {
    const response = await axios.post(
      `${BASE_URL}?email=${encodeURIComponent(PAGSEGURO_EMAIL)}&token=${PAGSEGURO_TOKEN}`,
      xml,
      { 
        headers: { 
          'Content-Type': 'application/xml; charset=UTF-8',
          'Accept': 'application/xml'
        } 
      }
    );

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    const planCode = result.preApprovalRequest.code[0];
    
    console.log(`✅ Plano criado com sucesso!`);
    console.log(`   Código: ${planCode}`);
    console.log(`   Reference: ${planData.reference}`);
    
    return {
      reference: planData.reference,
      code: planCode,
      name: planData.name,
      amount: planData.amount
    };
  } catch (error) {
    console.error(`❌ Erro ao criar plano ${planData.reference}:`);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    throw error;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando criação de planos PagSeguro...\n');
  console.log(`📌 Ambiente: ${USE_SANDBOX ? 'SANDBOX (Testes)' : 'PRODUÇÃO'}`);
  console.log(`📧 Email: ${PAGSEGURO_EMAIL}`);
  console.log(`🔑 Token: ${PAGSEGURO_TOKEN.substring(0, 10)}...`);
  
  if (!PAGSEGURO_EMAIL.includes('@') || PAGSEGURO_TOKEN === 'SEU_TOKEN_AQUI') {
    console.error('\n❌ ERRO: Configure o email e token do PagSeguro no início do script!');
    process.exit(1);
  }

  const createdPlans = [];
  
  for (const plan of PLANS) {
    try {
      const result = await createPlan(plan);
      createdPlans.push(result);
      
      // Aguardar 1 segundo entre cada request para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`\n⚠️  Falha ao criar plano ${plan.reference}. Continuando...`);
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DOS PLANOS CRIADOS');
  console.log('='.repeat(60) + '\n');

  if (createdPlans.length === 0) {
    console.log('❌ Nenhum plano foi criado com sucesso.');
    process.exit(1);
  }

  createdPlans.forEach(plan => {
    console.log(`${plan.name}`);
    console.log(`  Reference: ${plan.reference}`);
    console.log(`  Código: ${plan.code}`);
    console.log(`  Valor: R$ ${plan.amount}/mês`);
    console.log('');
  });

  // Gerar configuração para environment.ts
  console.log('='.repeat(60));
  console.log('📝 CONFIGURAÇÃO PARA environment.ts');
  console.log('='.repeat(60) + '\n');

  const premiumMonthly = createdPlans.find(p => p.reference === 'PREMIUM_MONTHLY');
  const premiumYearly = createdPlans.find(p => p.reference === 'PREMIUM_YEARLY');
  const familyMonthly = createdPlans.find(p => p.reference === 'FAMILY_MONTHLY');
  const familyYearly = createdPlans.find(p => p.reference === 'FAMILY_YEARLY');

  console.log('pagseguro: {');
  console.log(`  testPublicKey: 'PUBLIC_KEY_FROM_DASHBOARD',`);
  console.log('  plans: {');
  console.log('    premium: {');
  console.log(`      monthly: '${premiumMonthly?.code || 'NOT_CREATED'}',`);
  console.log(`      yearly: '${premiumYearly?.code || 'NOT_CREATED'}'`);
  console.log('    },');
  console.log('    family: {');
  console.log(`      monthly: '${familyMonthly?.code || 'NOT_CREATED'}',`);
  console.log(`      yearly: '${familyYearly?.code || 'NOT_CREATED'}'`);
  console.log('    }');
  console.log('  }');
  console.log('}');

  console.log('\n✅ Script concluído com sucesso!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Copie a configuração acima');
  console.log('2. Cole em src/environments/environment.ts');
  console.log('3. Configure também em environment.prod.ts para produção');
  console.log('4. Configure o webhook em: https://sandbox.pagseguro.uol.com.br\n');
}

// Executar
main().catch(error => {
  console.error('\n💥 Erro fatal:', error.message);
  process.exit(1);
});
