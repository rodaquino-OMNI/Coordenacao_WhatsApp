# Roteiro Completo de Onboarding Conversacional via WhatsApp

**Persona:** Zeca/Ana (Adaptável por demografia)  
**Objetivo:** Coleta inteligente de dados de saúde através de conversa natural  
**Duração Estimada:** 15-20 minutos (distribuído em sessões)  
**Sistema de Gamificação:** HealthPoints + Badges + Barra de Progresso

---

## 🎯 **Estratégia Geral**

### **Princípios do Diálogo:**
1. **Naturalidade**: Conversa fluida, sem parecer interrogatório
2. **Progressividade**: Começar com perguntas fáceis, aumentar gradualmente a complexidade
3. **Ramificação Inteligente**: Perguntas condicionais baseadas em respostas anteriores
4. **Detecção Indireta**: Identificar condições sem perguntar diretamente
5. **Flexibilidade**: Permitir pausas e retomadas
6. **Reforço Positivo**: Gamificação para manter engajamento

### **Sinalizadores de Risco a Detectar:**
- 🔴 **Diabetes**: Sede excessiva, fome constante, cansaço, visão embaçada
- 🔴 **Hipertensão**: Dores de cabeça frequentes, tontura, falta de ar
- 🔴 **Apneia do Sono**: Ronco, sono agitado, cansaço matinal
- 🔴 **Cardiopatias**: Dor no peito, palpitações, falta de ar ao esforço
- 🔴 **Depressão/Ansiedade**: Mudanças de humor, energia baixa, isolamento
- 🔴 **Problemas Respiratórios**: Tosse crônica, alergias, falta de ar
- 🔴 **Obesidade**: Hábitos alimentares, sedentarismo
- 🔴 **Tabagismo/Alcoolismo**: Hábitos sociais, frequência de uso

---

## 📱 **FASE 1: BOAS-VINDAS E CONSENT MANAGEMENT**

### **1.1 Apresentação Inicial**

**🤖 Zeca:** "Olá, [Nome]! 👋 Que alegria te conhecer! Eu sou o Zeca, seu novo assistente de saúde digital da AUSTA! 

🎯 Estou aqui para ser seu parceiro no cuidado com sua saúde. Vamos descobrir juntos como eu posso te ajudar a viver melhor! 

⏰ Que tal batermos um papo de uns 10 minutinhos? Prometo que vai ser divertido! 😊"

**Opções:**
- `[🚀 Vamos começar!]`
- `[⏰ Agora não posso]`
- `[❓ O que você faz exatamente?]`

---

#### **🔄 Ramificação A1: "Agora não posso"**

**🤖 Zeca:** "Sem problema algum! Entendo que você está ocupado(a). 

Quando seria melhor para a gente conversar?"

**Opções:**
- `[🌅 De manhã (8h-12h)]`
- `[☀️ À tarde (12h-18h)]`
- `[🌙 À noite (18h-22h)]`

**💡 Estratégia:** Sistema agenda novo contato no horário preferido + cria evento no Camunda BPM

---

#### **🔄 Ramificação A2: "O que você faz exatamente?"**

**🤖 Zeca:** "Ótima pergunta! Sou como um assistente pessoal para sua saúde! 🩺

✅ Te lembro de exames e consultas  
✅ Respondo dúvidas sobre seu plano  
✅ Te ajudo a agendar consultas rapidinho  
✅ Dou dicas personalizadas de bem-estar  
✅ Estou aqui 24h se você não estiver se sentindo bem  

E o mais legal: vou aprender seus hábitos para cuidar de você de forma única! 

Bora conhecer você melhor?"

**Opções:**
- `[😍 Adorei! Vamos lá!]`
- `[🤔 Ainda tenho dúvidas]`

---

### **1.2 Consentimento LGPD (Gamificado)**

**🤖 Zeca:** "Antes de começarmos nossa jornada, preciso da sua autorização para coletar alguns dados sobre sua saúde. 

🔒 **Por que preciso disso?**  
Para criar seu perfil único de cuidados e te ajudar de forma personalizada!

🛡️ **Seus dados são seguros?**  
100%! Seguimos a LGPD rigorosamente. Só nossa equipe médica tem acesso.

📋 **Quer ler os detalhes?** [Link para Política de Privacidade]

🎮 **E tem mais**: completando seu perfil, você ganha seus primeiros **100 HealthPoints**! 🏆

Posso prosseguir?"

**Opções:**
- `[✅ Sim, autorizo]`
- `[❌ Não autorizo]`
- `[📖 Quero ler os termos primeiro]`

---

#### **🔄 Ramificação B1: "Não autorizo"**

**🤖 Zeca:** "Entendo e respeito totalmente sua decisão! 👍

Mesmo sem a coleta de dados de saúde, ainda posso te ajudar com:
- Dúvidas sobre seu plano
- Agendamentos e autorizações  
- Localizar prestadores
- Informações gerais

Vou continuar aqui para quando precisar, ok? 😊"

**💡 Estratégia:** Bot entra em "modo limitado" - funcionalidades básicas apenas

---

## 🎮 **FASE 2: GAMIFICAÇÃO E MISSÕES**

### **2.1 Apresentação do Sistema de Recompensas**

**🤖 Zeca:** "Que ótimo! Agora vou te explicar como funciona nossa jornada! 🗺️

🎮 **SISTEMA HEALTHPOINTS:**
- Cada informação que você compartilha = pontos
- Pontos desbloqueiam benefits exclusivos
- Badges especiais por categorias completadas

🏆 **SUAS MISSÕES:**
1. 👤 Missão "Me Conhece" → 100 pontos
2. 🏃 Missão "Estilo de Vida" → 150 pontos  
3. 💤 Missão "Bem-estar" → 200 pontos
4. 🩺 Missão "Saúde Atual" → 250 pontos
5. 📋 Missão "Documentos" → 300 pontos

**TOTAL: 1000 HealthPoints** = Badge "Perfil Completo" 🥇

Bora começar com a primeira missão?"

**Opções:**
- `[🚀 Vamos nessa!]`
- `[❓ Que benefits posso ganhar?]`

---

## 👤 **MISSÃO 1: "ME CONHECE" (100 HealthPoints)**

### **3.1 Dados Básicos e Rapport**

**🤖 Zeca:** "🎯 **MISSÃO 1: ME CONHECE** - Vamos nos conhecer melhor!

Para começar, me conta um pouco sobre você! Como é seu dia a dia? Trabalha, estuda, ambos, ou está numa fase diferente da vida?"

**💡 Estratégia:** Pergunta aberta para:
- Avaliar letramento digital (qualidade da resposta)
- Identificar nível de estresse (rotina agitada)
- Determinar atividade física indireta (trabalho sedentário vs ativo)
- Adaptar tom da conversa (formal vs casual)

**Análise de Resposta por IA:**
- **Palavras-chave de estresse:** "corrido", "louco", "sem tempo", "pressão"
- **Indicadores de sedentarismo:** "escritório", "computador", "sentado"
- **Sinais de aposentadoria:** "aposentado", "em casa", "não trabalho mais"

---

### **3.2 Contexto Familiar e Social**

**🤖 Zeca:** "Legal saber disso! E sobre família, você mora sozinho(a) ou com outras pessoas? Essa informação me ajuda a entender sua rede de apoio! 👨‍👩‍👧‍👦"

**Opções:**
- `[👤 Sozinho(a)]`
- `[👥 Com família/parceiro(a)]`
- `[🏠 Com amigos/colegas]`
- `[🏥 Em cuidado institucional]`

**💡 Estratégia:** 
- Identificar rede de apoio (importante para adesão a tratamentos)
- Detectar possível isolamento social (risco de depressão)
- Entender dinâmica familiar (cuidadores disponíveis)

---

#### **🔄 Ramificação C1: "Sozinho(a)"**

**🤖 Zeca:** "Entendi! Morar sozinho(a) tem seus prós e contras, né? 

Uma curiosidade: você gosta dessa independência ou às vezes sente falta de mais companhia?"

**Opções:**
- `[😊 Gosto muito da independência]`
- `[😐 É ok, me adaptei]`  
- `[😔 Às vezes é meio solitário]`

**💡 Estratégia:** Avaliar risco de isolamento social e solidão (fator de risco para depressão e problemas cardíacos)

---

### **3.3 Hobbies e Atividades (Indicadores de Personalidade)**

**🤖 Zeca:** "Agora me conta: no seu tempo livre, o que você mais gosta de fazer para relaxar e se divertir? 🎨"

**💡 Estratégia:** Pergunta aberta para identificar:
- **Atividades sedentárias:** TV, jogos, leitura → possível sedentarismo
- **Atividades sociais:** sair com amigos, eventos → saúde mental positiva  
- **Atividades físicas:** esportes, caminhada → estilo de vida ativo
- **Atividades criativas:** artesanato, música → outlet de estresse
- **Nenhuma atividade:** possível depressão ou falta de energia

**Análise de IA por categorias:**
- **Alto Risco:** "durmo", "não faço nada", "não tenho tempo"
- **Médio Risco:** "vejo TV", "fico no celular", "descanso"  
- **Baixo Risco:** "exercito", "saio", "pratico", "caminho"

---

### **3.4 Encerramento da Missão 1**

**🤖 Zeca:** "🎉 **PARABÉNS!** Você completou a **MISSÃO 1: ME CONHECE**!

✅ +100 HealthPoints conquistados!  
🏆 Badge "Primeiro Passo" desbloqueado!

**Pontuação atual: 100/1000 HealthPoints**

Que tal partirmos para a **MISSÃO 2: ESTILO DE VIDA**? Vai ser interessante descobrir seus hábitos! 🏃‍♂️"

**Opções:**
- `[🚀 Vamos para a próxima!]`
- `[⏸️ Vou fazer uma pausa]`
- `[📊 Ver meu progresso]`

---

## 🏃 **MISSÃO 2: "ESTILO DE VIDA" (150 HealthPoints)**

### **4.1 Atividade Física (Detecção de Sedentarismo)**

**🤖 Zeca:** "🎯 **MISSÃO 2: ESTILO DE VIDA** 

Vamos falar sobre movimento! Você costuma praticar alguma atividade física regularmente?"

**Opções:**
- `[💪 Sim, sou bem ativo(a)]`
- `[🚶 Às vezes, quando dá]`
- `[😅 Sou mais do tipo sedentário]`

---

#### **🔄 Ramificação D1: "Sim, sou bem ativo(a)"**

**🤖 Zeca:** "Que máximo! Adoro ouvir isso! 🏆

Qual atividade você mais curte fazer?"

**Opções:**
- `[🏃 Corrida/caminhada]`
- `[🏋️ Academia/musculação]`
- `[⚽ Esportes coletivos]`
- `[🧘 Yoga/pilates]`
- `[🚴 Bike/natação]`
- `[💃 Dança]`

**Follow-up:** "E com que frequência você consegue praticar?"

**Opções:**
- `[📅 Todo dia ou quase]`
- `[📅 3-4x por semana]`  
- `[📅 1-2x por semana]`

**💡 Estratégia:** Validar consistência da atividade física (pessoas podem superestimar)

---

#### **🔄 Ramificação D2: "Às vezes, quando dá"**

**🤖 Zeca:** "Entendo! A rotina às vezes aperta mesmo, né? 

O que mais te atrapalha para se exercitar com mais frequência?"

**Opções:**
- `[⏰ Falta de tempo]`
- `[😴 Falta de energia/ânimo]`
- `[💰 Questões financeiras]`
- `[🤷 Não acho algo que eu goste]`
- `[🦵 Limitações físicas]`

**💡 Estratégia:** Identificar barreiras específicas para futuras intervenções personalizadas

**Follow-up baseado na resposta:**

**Se "Falta de energia/ânimo":**
**🤖 Zeca:** "Hmm, falta de energia é algo que precisa atenção. Isso acontece mais em algum período específico do dia?"

**Se "Limitações físicas":**  
**🤖 Zeca:** "Entendi. Posso perguntar que tipo de limitação? É algo temporário ou você convive há mais tempo?"

---

#### **🔄 Ramificação D3: "Sou mais do tipo sedentário"**

**🤖 Zeca:** "Poxa, obrigado pela sinceridade! Isso é super comum hoje em dia.

Se você pudesse mudar uma coisa para se movimentar mais, o que seria?"

**Opções:**
- `[⏰ Ter mais tempo livre]`
- `[💪 Ter mais disposição]`
- `[👥 Ter companhia para exercitar]`
- `[🎯 Saber por onde começar]`
- `[💰 Ter condições financeiras]`

**💡 Estratégia:** Mapeamento de barreiras para programa futuro de incentivo à atividade física

---

### **4.2 Hábitos Alimentares (Screening para Diabetes/Obesidade)**

**🤖 Zeca:** "Agora vamos falar de um assunto gostoso: comida! 🍎

Como você descreveria sua alimentação no dia a dia?"

**Opções:**
- `[🥗 Bem equilibrada, com frutas e vegetais]`
- `[😐 Mais ou menos, poderia melhorar]`
- `[🍕 Baseada em comidas práticas/rápidas]`
- `[🍽️ Irregular, pulo refeições às vezes]`

---

#### **🔄 Ramificação E1: "Baseada em comidas práticas/rápidas"**

**🤖 Zeca:** "Entendo! Vida corrida pede praticidade mesmo.

Uma curiosidade: você tem notado se sente mais sede que o normal ultimamente?"

**Opções:**
- `[💧 Sim, tenho sentido mais sede]`
- `[😐 Normal, nada demais]`

**💡 Estratégia:** Combinação "comida rápida + sede excessiva" = **ALERTA DIABETES**

**Se "Sim, tenho sentido mais sede":**
**🤖 Zeca:** "Hmm, interessante. E fome? Tem sentido mais fome entre as refeições também?"

**🚨 Sistema:** Ativar flag "RISCO_DIABETES" para acompanhamento da enfermagem

---

#### **🔄 Ramificação E2: "Irregular, pulo refeições"**

**🤖 Zeca:** "Entendi. E quando você pula refeições, costuma sentir tontura ou fraqueza?"

**Opções:**
- `[😵 Sim, às vezes fico tonto(a)]`
- `[😐 Não, fico normal]`

**💡 Estratégia:** Hipoglicemia reativa ou outros distúrbios metabólicos

---

### **4.3 Hidratação e Sede (Screening Diabetes Aprofundado)**

**🤖 Zeca:** "Falando em líquidos, você bebe bastante água durante o dia?"

**Opções:**
- `[💧 Sim, bebo muita água]`
- `[😐 Bebo o normal]`
- `[😅 Esqueço de beber água]`

#### **Se "Sim, bebo muita água" + flag anterior de sede:**

**🤖 Zeca:** "Legal manter-se hidratado! Uma pergunta meio pessoal: tem ido ao banheiro mais vezes que o normal ultimamente?"

**Opções:**
- `[🚽 Sim, bem mais que antes]`
- `[😐 Normal]`

**🚨 Sistema:** Tríade "sede + fome + urina frequente" = **ALERTA CRÍTICO DIABETES**

---

### **4.4 Hábitos Sociais (Screening Álcool/Tabaco)**

**🤖 Zeca:** "Mudando de assunto, sobre hábitos sociais: você costuma sair com amigos, ir a festas, eventos?"

**Opções:**
- `[🎉 Sim, sou bem sociável]`
- `[😐 Às vezes, quando convida]`
- `[🏠 Prefiro ficar em casa]`

#### **🔄 Ramificação F1: "Sim, sou bem sociável"**

**🤖 Zeca:** "Que legal! E nessas ocasiões, você costuma beber alguma coisa alcoólica?"

**Opções:**
- `[🍷 Sim, socialmente]`
- `[🍺 Sim, gosto de beber]`
- `[🚫 Não bebo álcool]`

**Se bebe socialmente:**
**🤖 Zeca:** "E com que frequência isso acontece, mais ou menos?"

**Opções:**
- `[📅 Final de semana]`
- `[📅 Algumas vezes por semana]`
- `[📅 Todo dia ou quase]`

**💡 Estratégia:** Detectar possível dependência alcoólica

---

### **4.5 Tabagismo (Abordagem Indireta)**

**🤖 Zeca:** "Só mais uma curiosidade sobre hábitos: você fuma ou já fumou em algum período da vida?"

**Opções:**
- `[🚭 Nunca fumei]`
- `[🚬 Já fumei, mas parei]`
- `[🚬 Fumo atualmente]`

#### **🔄 Ramificação G1: "Fumo atualmente"**

**🤖 Zeca:** "Entendi. Sem julgamentos! Mais ou menos quantos cigarros por dia?"

**Opções:**
- `[🚬 Menos de 10]`
- `[🚬 Entre 10-20]`
- `[🚬 Mais de 20]`

**Follow-up:** "E você já pensou em parar ou tentou parar alguma vez?"

**💡 Estratégia:** Avaliar motivação para cessação + cálculo de carga tabágica

---

### **4.6 Encerramento da Missão 2**

**🤖 Zeca:** "🎉 **MISSÃO 2 CONCLUÍDA!** Que progresso incrível!

✅ +150 HealthPoints conquistados!  
🏆 Badge "Estilo Consciente" desbloqueado!

**Pontuação atual: 250/1000 HealthPoints**

Próxima parada: **MISSÃO 3: BEM-ESTAR** - Vamos falar sobre sono e energia! 💤"

---

## 💤 **MISSÃO 3: "BEM-ESTAR" (200 HealthPoints)**

### **5.1 Qualidade do Sono (Screening Apneia/Insônia)**

**🤖 Zeca:** "🎯 **MISSÃO 3: BEM-ESTAR**

Vamos falar de algo super importante: seu descanso! 😴

De 0 a 10, que nota você daria para a qualidade do seu sono?"

**Input:** Número de 0-10

#### **🔄 Ramificação H1: Nota ≤ 6 (Sono Ruim)**

**🤖 Zeca:** "Hmm, dá para melhorar essa nota, né? 

O que mais te incomoda no seu sono?"

**Opções:**
- `[😴 Demoro muito para conseguir dormir]`
- `[🌙 Acordo várias vezes durante a noite]`
- `[😪 Acordo cansado(a), mesmo dormindo]`
- `[⏰ Durmo poucas horas]`

#### **🔄 Sub-ramificação H1.1: "Acordo cansado(a)"**

**🤖 Zeca:** "Puxa, acordar cansado é muito ruim mesmo! 

Uma pergunta: alguém já comentou que você ronca muito ou que às vezes parece parar de respirar enquanto dorme?"

**Opções:**
- `[😴 Sim, já me falaram que ronco muito]`
- `[😰 Sim, já notaram pausas na respiração]`
- `[🤐 Não que eu saiba]`
- `[🛏️ Durmo sozinho(a), não sei]`

**🚨 Sistema:** Resposta "pausas na respiração" = **ALERTA CRÍTICO APNEIA DO SONO**

**Follow-up para apneia:**
**🤖 Zeca:** "Entendi. E durante o dia, você costuma sentir muito sono ou cochila involuntariamente?"

**Opções:**
- `[😴 Sim, tenho muito sono durante o dia]`
- `[🚗 Já cochilei dirigindo ou em situações perigosas]`
- `[😐 Só o cansaço normal]`

---

### **5.2 Energia e Disposição (Screening Depressão/Hipotireoidismo)**

**🤖 Zeca:** "Agora sobre energia: pensando nos últimos meses, como tem sido sua disposição no dia a dia?"

**Opções:**
- `[⚡ Cheio(a) de energia sempre]`
- `[😐 Normal, com altos e baixos]`
- `[😴 Quase sempre cansado(a) e sem ânimo]`
- `[📈 Depende muito do dia]`

#### **🔄 Ramificação I1: "Quase sempre cansado(a)"**

**🤖 Zeca:** "Poxa, isso deve ser bem chato. Há quanto tempo você vem se sentindo assim?"

**Opções:**
- `[📅 Algumas semanas]`
- `[📅 Alguns meses]`
- `[📅 Mais de um ano]`
- `[🤷 Não lembro quando começou]`

**Follow-up:** "E isso afeta suas atividades do dia a dia, trabalho ou relacionamentos?"

**Opções:**
- `[😔 Sim, tenho dificuldade para fazer as coisas]`
- `[😐 Um pouco, mas dou conta]`
- `[💪 Não, forço a barra e faço tudo]`

**💡 Estratégia:** Fadiga crônica pode indicar depressão, hipotireoidismo, anemia, etc.

---

### **5.3 Humor e Estado Emocional (Screening Depressão/Ansiedade)**

**🤖 Zeca:** "Falando em sentimentos, como você definiria seu humor na maior parte do tempo?"

**Opções:**
- `[😊 Geralmente positivo e animado]`
- `[😐 Neutro, nem muito bem nem mal]`
- `[😔 Mais para baixo ultimamente]`
- `[😰 Ansioso(a) na maior parte do tempo]`
- `[🎭 Muda muito, imprevisível]`

#### **🔄 Ramificação J1: "Mais para baixo ultimamente"**

**🤖 Zeca:** "Entendo, e obrigado por compartilhar isso comigo. 

Você diria que perdeu o interesse em coisas que antes gostava de fazer?"

**Opções:**
- `[😔 Sim, não tenho vontade para nada]`
- `[😐 Algumas coisas ainda me interessam]`
- `[🤔 Não havia pensado nisso]`

**🚨 Sistema:** Humor baixo + anedonia = **ALERTA DEPRESSÃO**

#### **🔄 Ramificação J2: "Ansioso(a) na maior parte do tempo"**

**🤖 Zeca:** "A ansiedade pode ser bem desconfortável. 

Você sente sintomas físicos junto com a ansiedade? Tipo coração acelerado, falta de ar?"

**Opções:**
- `[💓 Sim, coração dispara]`
- `[😰 Falta de ar e aperto no peito]`
- `[🤢 Mal-estar no estômago]`
- `[😵 Tontura ou tremores]`
- `[😐 Mais mental que físico]`

**💡 Estratégia:** Distinguir ansiedade generalizada de possíveis problemas cardíacos

---

### **5.4 Stress e Pressão (Contexto Psicossocial)**

**🤖 Zeca:** "Você diria que tem muito estresse ou pressão na sua vida atualmente?"

**Opções:**
- `[😤 Sim, bastante estresse]`
- `[😐 Normal para a vida que levo]`
- `[😌 Não, vida bem tranquila]`

#### **🔄 Ramificação K1: "Sim, bastante estresse"**

**🤖 Zeca:** "O estresse pode afetar muito nossa saúde. De onde vem principalmente?"

**Opções:**
- `[💼 Trabalho/estudos]`
- `[💰 Questões financeiras]`
- `[👥 Relacionamentos familiares]`
- `[🏥 Problemas de saúde]`
- `[🌍 Várias coisas ao mesmo tempo]`

**Follow-up:** "E como você costuma lidar com esse estresse?"

**Análise de resposta aberta para identificar:**
- Estratégias saudáveis: exercício, meditação, terapia
- Estratégias prejudiciais: álcool, drogas, isolamento
- Ausência de estratégias: pode precisar de orientação

---

### **5.5 Encerramento da Missão 3**

**🤖 Zeca:** "🎉 **MISSÃO 3 FINALIZADA!** Você está arrasando!

✅ +200 HealthPoints conquistados!  
🏆 Badge "Bem-estar Consciente" desbloqueado!

**Pontuação atual: 450/1000 HealthPoints**

Agora vamos para **MISSÃO 4: SAÚDE ATUAL** - Vamos entender como você está se sentindo! 🩺"

---

## 🩺 **MISSÃO 4: "SAÚDE ATUAL" (250 HealthPoints)**

### **6.1 Sintomas e Desconfortos Atuais**

**🤖 Zeca:** "🎯 **MISSÃO 4: SAÚDE ATUAL**

Vamos falar sobre como seu corpo está se sentindo! 

Ultimamente você tem sentido algum desconforto ou sintoma que aparece com frequência?"

**Opções:**
- `[😊 Não, estou me sentindo bem]`
- `[🤕 Sim, tenho alguns incômodos]`
- `[🤔 Não tenho certeza]`

#### **🔄 Ramificação L1: "Sim, tenho alguns incômodos"**

**🤖 Zeca:** "Entendi. Pode me contar quais são? Pode ser qualquer coisa - dor, desconforto, algo que você notou..."

**💡 Estratégia:** Pergunta aberta para capturar sintomas. IA analisa resposta para:

**Análise de sintomas por IA:**
- **Dor de cabeça frequente** → Investigar hipertensão
- **Falta de ar** → Investigar problemas cardíacos/pulmonares  
- **Dor no peito** → Investigar problemas cardíacos
- **Azia/queimação** → Investigar problemas gástricos
- **Dores articulares** → Investigar artrite/artrose
- **Visão embaçada** → Investigar diabetes/hipertensão

**Follow-up inteligente baseado na resposta:**

---

#### **🔄 Sub-ramificação L1.1: Menção de "dor de cabeça"**

**🤖 Zeca:** "Dor de cabeça é bem chato mesmo. Com que frequência isso acontece?"

**Opções:**
- `[📅 Todo dia ou quase]`
- `[📅 Algumas vezes por semana]`
- `[📅 Algumas vezes por mês]`
- `[📅 Esporadicamente]`

**Se frequente (todo dia/algumas vezes por semana):**
**🤖 Zeca:** "E você já reparou se existe algum padrão? Acontece mais em algum horário específico ou situação?"

**Follow-up:** "Você já mediu sua pressão arterial recentemente?"

**🚨 Sistema:** Cefaleia frequente = **INVESTIGAR HIPERTENSÃO**

---

#### **🔄 Sub-ramificação L1.2: Menção de "falta de ar"**

**🤖 Zeca:** "Falta de ar pode ter várias causas. Isso acontece em que situações?"

**Opções:**
- `[🚶 Ao subir escadas ou caminhar]`
- `[🛏️ Mesmo em repouso]`
- `[😰 Quando fico ansioso(a)]`
- `[🌙 Mais à noite]`

**🚨 Sistema:** 
- "Em repouso" = **ALERTA CRÍTICO CARDÍACO**
- "Ao esforço" = **INVESTIGAR CARDIOPATIA/SEDENTARISMO**

---

### **6.2 Medicamentos e Tratamentos Atuais**

**🤖 Zeca:** "Agora uma pergunta importante: você faz algum tratamento médico ou usa algum medicamento de forma contínua atualmente?"

**Opções:**
- `[💊 Sim, uso medicação contínua]`
- `[🩺 Faço acompanhamento médico regular]`
- `[🚫 Não, nenhum tratamento]`
- `[🤔 Só remédios eventuais]`

#### **🔄 Ramificação M1: "Sim, uso medicação contínua"**

**🤖 Zeca:** "Entendi. Para eu não ter que fazer mil perguntas, você teria uma foto da receita ou da caixa do remédio aí com você? 

Nossa tecnologia consegue ler as informações automaticamente! É super seguro e rápido. 📸"

**Opções:**
- `[📸 Vou enviar foto da receita]`
- `[📸 Vou enviar foto do remédio]`
- `[✍️ Prefiro digitar o nome]`
- `[⏰ Não tenho agora, depois envio]`

**💡 Estratégia:** OCR de documentos médicos + análise farmacológica automática

#### **Se escolher digitar:**
**🤖 Zeca:** "Sem problema! Pode me dizer qual medicamento e para que você usa?"

**Análise de medicamentos por IA:**
- **Anti-hipertensivos** → Confirma HAS, investigar controle
- **Metformina/insulina** → Confirma diabetes
- **Antidepressivos** → Confirma transtorno mental
- **Anticonvulsivantes** → Investigar epilepsia/dor neuropática

---

### **6.3 Histórico de Exames e Consultas**

**🤖 Zeca:** "Você costuma fazer check-ups ou exames de rotina?"

**Opções:**
- `[✅ Sim, regularmente]`
- `[😐 Às vezes, quando lembro]`
- `[❌ Não tenho esse hábito]`
- `[🩺 Só quando estou doente]`

#### **🔄 Ramificação N1: "Sim, regularmente"**

**🤖 Zeca:** "Que ótimo! Quando foi sua última consulta ou exame de rotina?"

**Opções:**
- `[📅 Nos últimos 3 meses]`
- `[📅 Nos últimos 6 meses]`
- `[📅 No último ano]`
- `[📅 Faz mais de um ano]`

**Se recente (últimos 6 meses):**
**🤖 Zeca:** "Perfeito! Você tem algum resultado de exame dos últimos 6 meses aí? Se tiver, pode me enviar uma foto! Nossa IA consegue ler e organizar tudo para sua equipe de cuidado. 📋"

---

### **6.4 Antecedentes Familiares (Screening Genético)**

**🤖 Zeca:** "Uma informação importante para sua saúde: na sua família (pais, irmãos, avós), alguém tem ou teve alguma doença importante?"

**Opções:**
- `[❤️ Problemas cardíacos]`
- `[🍬 Diabetes]`
- `[🧠 Pressão alta]`
- `[🎗️ Câncer]`
- `[🚫 Não que eu saiba]`
- `[🤷 Não conheço o histórico]`

**💡 Estratégia:** Múltipla escolha para principais fatores de risco genético

#### **Follow-up para cada condição selecionada:**

**Se selecionou "Diabetes":**
**🤖 Zeca:** "Entendi. Quantas pessoas da família têm ou tiveram diabetes?"

**Opções:**
- `[1️⃣ Uma pessoa]`
- `[2️⃣ Duas pessoas]`
- `[3️⃣ Três ou mais]`

**🚨 Sistema:** Histórico familiar forte = **AUMENTAR PRIORIDADE SCREENING**

---

### **6.5 Encerramento da Missão 4**

**🤖 Zeca:** "🎉 **MISSÃO 4 CONCLUÍDA!** Estamos quase lá!

✅ +250 HealthPoints conquistados!  
🏆 Badge "Saúde Transparente" desbloqueado!

**Pontuação atual: 700/1000 HealthPoints**

Última missão: **MISSÃO 5: DOCUMENTOS** - Vamos organizar seus dados de saúde! 📋"

---

## 📋 **MISSÃO 5: "DOCUMENTOS" (300 HealthPoints)**

### **7.1 Coleta de Documentos Médicos**

**🤖 Zeca:** "🎯 **MISSÃO 5 FINAL: DOCUMENTOS**

Para completar seu perfil de saúde, seria incrível se você pudesse compartilhar alguns documentos! Nossa IA lê tudo automaticamente e organiza para sua equipe de cuidado. 🤖

Você tem algum destes documentos dos últimos 12 meses?"

**Opções múltiplas:**
- `[🩸 Exames de sangue]`
- `[🫀 Eletrocardiograma]`
- `[📷 Exames de imagem (RX, ultrassom)]`
- `[💊 Receitas médicas atuais]`
- `[📋 Relatórios de consultas]`
- `[🚫 Não tenho nenhum]`

#### **🔄 Para cada tipo selecionado:**

**🤖 Zeca:** "Ótimo! Pode enviar foto do(s) exame(s) de sangue? Não se preocupe com a qualidade - nossa IA consegue ler até imagens não muito nítidas! 📸"

**Processamento OCR:**
- Extração automática de valores
- Identificação de alterações
- Comparação com valores de referência
- Estruturação em formato FHIR
- Alertas para valores críticos

---

### **7.2 Informações de Emergência**

**🤖 Zeca:** "Para finalizar, vou precisar de algumas informações importantes para emergências:

Quem devemos contatar se algo urgente acontecer com você?"

**Input:** Nome e telefone do contato de emergência

**🤖 Zeca:** "E você tem alguma alergia conhecida a medicamentos ou outras substâncias?"

**Opções:**
- `[🚫 Não tenho alergias conhecidas]`
- `[💊 Sim, a medicamentos]`
- `[🥜 Sim, a alimentos]`
- `[🌸 Sim, a outras substâncias]`

#### **Se tem alergias:**
**🤖 Zeca:** "Pode me contar quais? É muito importante para sua segurança!"

**Input:** Texto livre sobre alergias

---

### **7.3 Finalização Completa do Onboarding**

**🤖 Zeca:** "🎉🏆 **PARABÉNS! TODAS AS MISSÕES CONCLUÍDAS!** 

✅ +300 HealthPoints conquistados!  
🥇 **Badge "PERFIL COMPLETO" desbloqueado!**

**🎯 PONTUAÇÃO FINAL: 1000/1000 HealthPoints**

**🎁 RECOMPENSAS DESBLOQUEADAS:**
- Consulta de check-up gratuita 🩺
- Acesso prioritário ao agendamento ⚡
- Relatório personalizado de saúde 📊
- Programa de bem-estar customizado 🌟

**Próximos passos:**
1. Nossa IA está analisando suas informações agora 🤖
2. Em 24h você receberá seu Relatório de Saúde Personalizado 📋
3. Uma de nossas enfermeiras pode entrar em contato para se apresentar 👩‍⚕️
4. Vou te enviar dicas personalizadas de bem-estar 💡

**Lembre-se: estou aqui 24h por dia! Para qualquer dúvida, agendamento ou se não estiver se sentindo bem, é só me chamar! 😊**

Salva meu número nos seus contatos: **Zeca AUSTA** 💚

Obrigado por confiar na gente! Se cuida! 🙏"

---

## 🎯 **ESTRATÉGIAS DE RAMIFICAÇÃO E LÓGICA**

### **Sistema de Scoring de Risco Automatizado**

```python
# Pseudocódigo do algoritmo de scoring
def calculate_risk_score(responses):
    risk_score = 0
    flags = []
    
    # Fatores de risco cardiovascular
    if responses.get('headache_frequency') == 'daily':
        risk_score += 30
        flags.append('HYPERTENSION_RISK')
    
    if responses.get('chest_pain') or responses.get('shortness_of_breath'):
        risk_score += 50
        flags.append('CARDIAC_RISK')
    
    # Fatores de risco diabetes
    if (responses.get('thirst') == 'excessive' and 
        responses.get('diet') == 'fast_food' and
        responses.get('urination') == 'frequent'):
        risk_score += 60
        flags.append('DIABETES_RISK')
    
    # Fatores de risco apneia
    if (responses.get('sleep_quality') <= 6 and
        responses.get('snoring') == 'severe' and
        responses.get('breathing_pauses') == 'yes'):
        risk_score += 70
        flags.append('SLEEP_APNEA_RISK')
    
    # Fatores de risco mental
    if (responses.get('mood') == 'down' and
        responses.get('anhedonia') == 'yes' and
        responses.get('energy') == 'low'):
        risk_score += 40
        flags.append('DEPRESSION_RISK')
    
    return risk_score, flags
```

### **Triggers de Escalação Automática**

| Condição | Score | Ação |
|----------|-------|------|
| Diabetes Risk | ≥60 | Contato enfermagem em 24h |
| Cardiac Risk | ≥50 | Contato enfermagem em 12h |
| Sleep Apnea | ≥70 | Agendamento pneumologia |
| Depression | ≥40 | Contato psicologia |
| Multiple Risks | ≥100 | Escalação médico assistente |

### **Personalização da Persona**

**Algoritmo de seleção Zeca vs Ana:**
- **Idade 18-35 + Gênero Masculino** → Zeca
- **Idade 18-35 + Gênero Feminino** → Ana
- **Idade 36-60** → Escolha baseada em preferência (pergunta inicial)
- **Idade 60+** → Ana (tom mais formal e carinhoso)

**Adaptação de linguagem:**
- **Alta escolaridade** (detecção via qualidade das respostas) → Linguagem técnica
- **Baixa escolaridade** → Linguagem simplificada + mais emojis
- **Região** (via DDD) → Expressões regionais sutis

### **Sistema de Retomada Inteligente**

Se usuário para no meio:
1. **Aguarda 2 horas** → Mensagem suave: "Oi! Quando quiser continuar nossa conversa, é só me chamar! 😊"
2. **Aguarda 24 horas** → "Olá! Que tal completarmos seu perfil? Faltam só [X] missões para ganhar todos os HealthPoints!"
3. **Aguarda 3 dias** → "Sentimos sua falta! Sua saúde é importante. Quando puder, vamos finalizar seu cadastro? 💚"
4. **Aguarda 1 semana** → Transfere para equipe humana para contato telefônico

---

## 📊 **Métricas de Sucesso do Onboarding**

### **KPIs Principais:**
- **Taxa de Completude:** >85% dos usuários finalizam todas as missões
- **Tempo Médio:** <20 minutos distribuído em sessões
- **Engajamento:** >90% respondem às primeiras 3 mensagens
- **Satisfação:** NPS >70 no final do processo
- **Detecção de Riscos:** >95% de acurácia na identificação de condições conhecidas

### **Alertas e Escalações:**
- **Crítico (Score ≥80):** Escalação imediata para enfermagem
- **Alto (Score 60-79):** Contato em 24h
- **Médio (Score 40-59):** Agendamento preventivo
- **Baixo (Score <40):** Acompanhamento de rotina
