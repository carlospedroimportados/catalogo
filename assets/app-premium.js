/* Gerado por ferramentas/ajustar-app.js a partir de assets/app.js (7 trocas pontuais). Não editar à mão. */
(function(){
"use strict";
document.documentElement.classList.add("js");
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const P=DATA.products,B={};DATA.brands.forEach(b=>B[b.id]=b);
const catOf=p=>p.cat||B[p.brand].cat;
const CATN={perfume:"Perfumaria",skincare:"Skincare",cabelo:"Cabelos",bebida:"Bebidas",outros:"Outros"};
const norm=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const fmt=v=>"R$ "+v.toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const IC={
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2a9.9 9.9 0 00-8.5 15l-1.3 4.8 4.9-1.3A9.9 9.9 0 1012.04 2zm0 18.1a8.2 8.2 0 01-4.2-1.15l-.3-.18-2.9.76.78-2.83-.2-.3a8.2 8.2 0 1117.02-4.5 8.2 8.2 0 01-10.2 8.2zm4.5-6.1c-.25-.12-1.46-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06a6.7 6.7 0 01-3.33-2.9c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.48a.92.92 0 00-.66.31 2.8 2.8 0 00-.87 2.07 4.85 4.85 0 001.02 2.58c.12.16 1.76 2.7 4.27 3.78 1.59.69 2.21.75 3 .63.49-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/></svg>',
 chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
 ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/></svg>'};

/* ---------- cartão: taxa repassada ---------- */
const feeOf=n=>(CFG.fees[n]||0)/100;
function cardCalc(base,n){const par=Math.ceil(base/(1-feeOf(n))/n*100-1e-9)/100;return{n,par,total:Math.round(par*n*100)/100}}
function cardOptions(base){const o=[];for(let n=1;n<=12;n++){const c=cardCalc(base,n);if(n===1||c.par>=CFG.minParcela)o.push(c)}return o}

/* ---------- estado ---------- */
const st={cat:"all",brand:"all",q:"",sort:"cat",limit:24};
let bag={};try{bag=JSON.parse(localStorage.getItem("cp3_bag")||"{}")||{}}catch(e){}
let coupon=null,cupIn="",cupMsg="",cupBusy=false;
let pay="pix",inst=0,step="bag",cust={name:"",cpf:"",phone:"",email:""},consent=false,lastOrder=null,busy=false,err="";
try{pay=localStorage.getItem("cp3_pay")==="card"?"card":"pix";inst=+localStorage.getItem("cp3_inst")||0;const c=JSON.parse(localStorage.getItem("cp3_cust")||"{}");cust.name=c.name||"";cust.phone=c.phone||"";cust.email=c.email||""}catch(e){}
const save=()=>{try{localStorage.setItem("cp3_bag",JSON.stringify(bag));localStorage.setItem("cp3_pay",pay);localStorage.setItem("cp3_inst",String(inst));localStorage.setItem("cp3_cust",JSON.stringify({name:cust.name,phone:cust.phone,email:cust.email}))}catch(e){}};
const items=()=>Object.entries(bag).map(([i,q])=>({p:P[+i],q})).filter(x=>x.p&&x.q>0);
const subtotal=()=>items().reduce((s,x)=>s+x.p.price*x.q,0);
const discount=s=>{if(!coupon||s<(coupon.min||0))return 0;const d=coupon.tipo==="%"?Math.round(s*Math.min(coupon.valor,100))/100:Math.min(coupon.valor,s-1);return Math.max(0,Math.round(d*100)/100)};
const count=()=>items().reduce((s,x)=>s+x.q,0);
const IMG={};$$("#grid .pc").forEach(c=>{IMG[+c.dataset.i]=c.querySelector("img").getAttribute("src")});
const cardEl={};$$("#grid .pc").forEach(c=>{cardEl[+c.dataset.i]=c});
const thumb=i=>{const m=/(\S+)\s+320w/.exec((cardEl[i]&&cardEl[i].querySelector("img").getAttribute("srcset"))||"");return m?m[1]:IMG[i]};
const grid=$("#grid");

let tT;function toast(m){const e=$("#toast");e.textContent=m;e.classList.add("on");clearTimeout(tT);tT=setTimeout(()=>e.classList.remove("on"),1900)}

/* ---------- cards ---------- */
const stepper=(i,q,cls)=>`<div class="stp ${cls||""}"><button type="button" data-dec="${i}" aria-label="Diminuir">−</button><span>${q}</span><button type="button" data-inc="${i}" aria-label="Aumentar">+</button></div>`;
const actHTML=i=>{const q=bag[i]||0;return q>0?stepper(i,q):`<button class="add" type="button" data-add="${i}">${IC.plus}Adicionar</button>`};
function syncCard(i){$$(`.pc[data-i="${i}"] .act`).forEach(a=>{a.innerHTML=actHTML(i)})}
function setQty(i,q){q=Math.max(0,Math.min(99,q));if(q)bag[i]=q;else delete bag[i];save();syncCard(i);updateBar();if(isOpen("#bag"))renderBag()}
function fillInst(root){(root||document).querySelectorAll(".pc .inst").forEach(e=>{const p=P[+e.closest(".pc").dataset.i];const o=cardOptions(p.price),m=o[o.length-1];e.textContent=m.n>1?`ou ${m.n}x de ${fmt(m.par)} no cartão`:"no cartão: "+fmt(m.total)})}

/* ---------- catálogo ---------- */
function match(p){
  if(p.test)return st.q==="teste";
  if(st.cat!=="all"&&catOf(p)!==st.cat)return false;
  if(st.brand!=="all"&&p.brand!==st.brand)return false;
  if(st.q){const t=norm(B[p.brand].name+" "+p.name+" "+p.spec+" "+(p.desc||"")+" "+infoText(p));if(!st.q.split(/\s+/).every(w=>t.includes(w)))return false}
  return true}
function infoText(p){const f=p.info||{};return[f.fam,(f.top||[]).join(" "),(f.mid||[]).join(" "),(f.base||[]).join(" "),f.obj,(f.ativos||[]).join(" ")].join(" ")}
function fillBrands(){const sel=$("#fBrand");const cnt={};P.forEach(p=>{if(st.cat==="all"||catOf(p)===st.cat)cnt[p.brand]=(cnt[p.brand]||0)+1});
  sel.innerHTML='<option value="all">Todas as marcas</option>'+DATA.brands.filter(b=>cnt[b.id]).map(b=>`<option value="${b.id}">${esc(b.name)} (${cnt[b.id]})</option>`).join("");
  if(!cnt[st.brand])st.brand="all";sel.value=st.brand}
function apply(){
  let list=P.filter(match);
  const r=i=>{const k=CFG.best.indexOf(i);return k<0?999:k};
  if(st.sort==="asc")list.sort((a,b)=>a.price-b.price||a.i-b.i);
  else if(st.sort==="desc")list.sort((a,b)=>b.price-a.price||a.i-b.i);
  else if(st.sort==="off")list.sort((a,b)=>(b.old?1-b.price/b.old:0)-(a.old?1-a.price/a.old:0)||a.i-b.i);
  else if(st.sort==="best")list.sort((a,b)=>r(a.i)-r(b.i)||a.i-b.i);
  else list.sort((a,b)=>a.i-b.i);
  const keep=new Set(list.map(p=>p.i));
  P.forEach(p=>{if(!keep.has(p.i))cardEl[p.i].hidden=true});
  list.forEach((p,k)=>{const c=cardEl[p.i];grid.appendChild(c);c.hidden=k>=st.limit});
  const tot=P.filter(p=>!p.test).length;$("#cnt").textContent=list.length===tot?`${list.length} produtos`:`${list.length} de ${tot} produtos`;
  $("#empty").hidden=list.length>0;
  const rest=list.length-st.limit;$("#more").hidden=rest<=0;$("#moreBtn").textContent=`Mostrar mais ${Math.min(24,rest)} produtos`;
  $$(".seg [data-cat]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.cat===st.cat)));
  $$(".cats-nav [data-cat]").forEach(b=>b.classList.toggle("pill",b.dataset.cat===st.cat&&st.cat!=="all"));
  $("#fSort").value=st.sort}
function goCat(cat,scroll){st.cat=cat;st.brand="all";st.limit=24;fillBrands();apply();if(scroll)$("#catalogo").scrollIntoView({behavior:"smooth",block:"start"})}

/* ---------- carrosséis ---------- */
function cloneCard(i){const c=cardEl[i].cloneNode(true);c.hidden=false;c.querySelector(".nojs")?.remove();return c}
function fillRow(el,ids){const t=typeof el==="string"?$("#"+el):el;if(!t)return;t.innerHTML="";ids.forEach(i=>t.appendChild(cloneCard(i)));fillInst(t);t.querySelectorAll(".pc").forEach(c=>{c.querySelector(".act").innerHTML=actHTML(+c.dataset.i)});
  const sec=t.closest("section");if(!ids.length&&sec)sec.hidden=true}
const offerIds=()=>P.filter(p=>p.old&&!p.test).sort((a,b)=>(1-b.price/b.old)-(1-a.price/a.old)).map(p=>p.i);
const newIds=()=>P.filter(p=>p.i>=CFG.newFrom&&p.i!==CFG.kitFrom&&!p.test).map(p=>p.i).reverse();
function wireArrows(root){(root||document).querySelectorAll(".row-wrap").forEach(w=>{if(w.dataset.w)return;w.dataset.w=1;const t=w.querySelector(".track");w.querySelectorAll(".arrow").forEach(a=>a.addEventListener("click",()=>t.scrollBy({left:(a.classList.contains("l")?-1:1)*t.clientWidth*.85,behavior:"smooth"})))})}
function related(p){const c=catOf(p);return P.filter(x=>x.i!==p.i&&!x.test).map(x=>({x,s:(x.brand===p.brand?0:10)+(catOf(x)===c?0:100)+Math.abs(x.price-p.price)/100})).sort((a,b)=>a.s-b.s).slice(0,10).map(o=>o.x.i)}

/* ---------- hero ---------- */
(function(){const sl=$$(".slide"),dots=$("#dots");if(sl.length<2)return;let k=0,tm=null;
  dots.innerHTML=sl.map((_,n)=>`<button type="button" aria-label="Banner ${n+1}" data-sl="${n}"></button>`).join("");
  const show=n=>{k=(n+sl.length)%sl.length;sl.forEach((s,j)=>s.classList.toggle("on",j===k));[...dots.children].forEach((d,j)=>d.setAttribute("aria-current",String(j===k)))};
  const play=()=>{stop();if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;tm=setInterval(()=>show(k+1),6500)},stop=()=>{if(tm){clearInterval(tm);tm=null}};
  dots.addEventListener("click",e=>{const b=e.target.closest("[data-sl]");if(b){show(+b.dataset.sl);play()}});
  const box=$(".slides");box.addEventListener("mouseenter",stop);box.addEventListener("mouseleave",play);box.addEventListener("focusin",stop);box.addEventListener("focusout",play);
  document.addEventListener("visibilitychange",()=>document.hidden?stop():play());
  let x0=null;box.addEventListener("touchstart",e=>{x0=e.touches[0].clientX},{passive:true});box.addEventListener("touchend",e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>45){show(k+(dx<0?1:-1));play()}x0=null});
  show(0);play()})();

/* ---------- Pix ---------- */
const tlv=(id,v)=>id+String(v.length).padStart(2,"0")+v;
function crc16(s){let c=0xFFFF;for(let i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(let k=0;k<8;k++)c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF}return c.toString(16).toUpperCase().padStart(4,"0")}
function pixPayload(v,txid){const mai=tlv("00","BR.GOV.BCB.PIX")+tlv("01",CFG.pix.key);
  let p=tlv("00","01")+tlv("01","11")+tlv("26",mai)+tlv("52","0000")+tlv("53","986")+(v>0?tlv("54",(Math.round(v*100)/100).toFixed(2)):"")+tlv("58","BR")+tlv("59",CFG.pix.name)+tlv("60",CFG.pix.city)+tlv("62",tlv("05",(txid||"***").replace(/[^A-Za-z0-9]/g,"").slice(0,25)||"***"));
  p+="6304";return p+crc16(p)}
function qrSvg(text){const L=window.__QR;if(!L)return"";let qr=null;for(let t=4;t<=20&&!qr;t++){try{const q=new L.QRCode(t,L.Level.M);q.addData(text);q.make();qr=q}catch(e){qr=null}}
  if(!qr)return"";const n=qr.getModuleCount(),m=4;let d="";for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))d+=`M${c+m},${r+m}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n+2*m} ${n+2*m}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`}

/* ---------- validação ---------- */
function cpfOk(c){c=String(c).replace(/\D/g,"");if(c.length!==11||/^(\d)\1+$/.test(c))return false;for(let t=9;t<11;t++){let s=0;for(let i=0;i<t;i++)s+=+c[i]*(t+1-i);if(((s*10)%11)%10!==+c[t])return false}return true}
const maskCpf=v=>v.replace(/\D/g,"").slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");
const maskTel=v=>{v=v.replace(/\D/g,"").slice(0,11);return v.length>10?v.replace(/(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3"):v.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3").replace(/[-\s(]+$/,"")};
function custErrors(){const e={};if(cust.name.trim().split(/\s+/).length<2)e.name="Informe nome e sobrenome.";if(!cpfOk(cust.cpf))e.cpf="CPF inválido.";const t=cust.phone.replace(/\D/g,"");if(t.length<10)e.phone="Informe DDD e número.";if(cust.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cust.email))e.email="E-mail inválido.";if(!consent)e.consent="Marque para continuar.";return e}

/* ---------- mensagens ---------- */
const lineOf=(p,q)=>`• ${q}× ${B[p.brand].short} ${p.name} (${p.spec}) — ${fmt(p.price*q)}`;
const waLink=(c,t)=>`https://wa.me/${c.phone}?text=${encodeURIComponent(t)}`;
function payLine(base){if(pay==="pix")return `Pix — ${fmt(base)} (sem acréscimo)`;const o=cardOptions(base);const c=o.find(x=>x.n===inst)||o[0];return `Cartão de crédito em ${c.n}x de ${fmt(c.par)} — total ${fmt(c.total)} (inclui taxa)`}
function orderMsg(c,ord){const its=ord?ord.items:items();const base=ord?ord.sub:subtotal();
  return `Olá, ${c.name}! Fiz um pedido pelo catálogo da CP Importados${ord&&ord.nsu?` (pedido ${ord.nsu})`:""}:\n\n${its.map(x=>lineOf(x.p,x.q)).join("\n")}\n\n${ord&&ord.disc?`Produtos: ${fmt(ord.prod)}\nCupom ${ord.cup}: − ${fmt(ord.disc)}\n`:""}Total: ${fmt(base)}\nPagamento: ${ord?ord.payLine:payLine(base)}\n\nNome: ${cust.name}\nTelefone: ${cust.phone}${ord&&ord.pay==="pix"?"\n\nVou enviar o comprovante do Pix.":ord?"":"\n\nPode me enviar o link de pagamento?"}`}

/* ---------- sacola / checkout ---------- */
function bagItemsHTML(){return items().map(x=>`<div class="li"><div class="th"><img src="${thumb(x.p.i)}" alt="" width="84" height="105" decoding="async"></div><div><b>${esc(B[x.p.brand].short)} ${esc(x.p.name)}</b><small>${esc(x.p.spec)}</small><div class="r2">${stepper(x.p.i,x.q)}<strong>${fmt(x.p.price*x.q)}</strong></div></div></div>`).join("")}
function payPicker(sub){const disc=discount(sub),base=Math.round((sub-disc)*100)/100;const dl=disc?`<div class="disc"><span>Cupom ${esc(coupon.code)}</span><span>− ${fmt(disc)}</span></div>`:"";const opts=cardOptions(base);if(!opts.find(o=>o.n===inst))inst=opts[opts.length-1].n;const cc=opts.find(o=>o.n===inst);
  let h=`<div><div class="eyebrow mb8">Forma de pagamento</div><div class="pm">
   <button class="pmb" type="button" data-pay="pix" aria-pressed="${pay==="pix"}"><b>Pix</b><small>${fmt(base)} · sem acréscimo</small></button>
   <button class="pmb" type="button" data-pay="card" aria-pressed="${pay==="card"}"><b>Cartão de crédito</b><small>até ${opts[opts.length-1].n}x de ${fmt(opts[opts.length-1].par)}</small></button></div></div>`;
  if(pay==="card"){h+=`<div><label class="eyebrow mb8" for="instSel" style="display:block">Parcelas</label><select class="sel" id="instSel">${opts.map(o=>`<option value="${o.n}" ${o.n===inst?"selected":""}>${o.n}x de ${fmt(o.par)} · total ${fmt(o.total)}</option>`).join("")}</select></div>
   <div class="sum"><div><span>Produtos</span><span>${fmt(sub)}</span></div>${dl}<div class="fee"><span>Taxa do cartão (${cc.n}x)</span><span>+ ${fmt(cc.total-base)}</span></div><div class="t"><span>Total no cartão</span><span>${fmt(cc.total)}</span></div>${cc.n>1?`<div><span>${cc.n} parcelas de</span><b>${fmt(cc.par)}</b></div>`:""}</div>
   <p class="note">A taxa da operadora é repassada no cartão. No Pix você paga ${fmt(base)} e <b class="eco">economiza ${fmt(cc.total-base)}</b>.</p>`}
  else h+=`<div class="sum">${disc?`<div><span>Produtos</span><span>${fmt(sub)}</span></div>${dl}`:""}<div class="t"><span>Total no Pix</span><span>${fmt(base)}</span></div></div><p class="note eco">Pagando no Pix você economiza ${opts.length>1?`de ${fmt(opts[0].total-base)} (cartão à vista) até ${fmt(opts[opts.length-1].total-base)} (cartão em ${opts[opts.length-1].n}x)`:`${fmt(opts[0].total-base)} em taxas do cartão`}.</p>`;
  return h}
function field(id,label,val,type,ph,ex){const e=showErr&&custErrors()[id];return `<label class="fld${e?" bad":""}"><span>${label}</span><input id="f_${id}" type="${type}" ${ex||""} value="${esc(val)}" placeholder="${ph}" autocomplete="${{name:"name",cpf:"off",phone:"tel",email:"email"}[id]}">${e?`<em>${e}</em>`:""}</label>`}
let showErr=false;
function couponBox(sub){if(coupon){const d=discount(sub);return `<div class="cup ok"><div><b>Cupom ${esc(coupon.code)}</b><small>${esc(coupon.label)}${d?"":` · compra mínima ${fmt(coupon.min)}`}</small></div><button type="button" class="rm" data-cuprm="1">Remover</button></div>`}
  return `<div><div class="eyebrow mb8">Cupom de desconto</div><div class="cup"><input id="f_cup" placeholder="Digite o cupom" value="${esc(cupIn)}" autocapitalize="characters" autocomplete="off"><button type="button" class="btn-line sm" data-cupok="1" ${cupBusy?"disabled":""}>${cupBusy?"…":"Aplicar"}</button></div>${cupMsg?`<p class="note warn">${esc(cupMsg)}</p>`:""}</div>`}
async function applyCoupon(){readForm();const code=cupIn.trim();if(!code){cupMsg="Digite o cupom.";return renderBag()}
  cupBusy=true;cupMsg="";renderBag();
  try{const r=await fetch(CFG.api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"coupon",code,subtotal:subtotal()})});const j=await r.json();
    if(j.ok){coupon={code:j.code,tipo:j.tipo,valor:j.valor,min:j.min||0,label:j.label};cupIn="";toast("Cupom aplicado")}else cupMsg=j.error||"Cupom inválido."}
  catch(e){cupMsg="Não foi possível validar o cupom agora."}
  cupBusy=false;renderBag()}
function renderBag(){
  const body=$("#bagBody"),keep=body.scrollTop,its=items(),base=subtotal();
  $("#bagT").textContent=step==="checkout"?"Finalizar compra":step==="done"?"Pedido realizado":"Sua sacola";
  if(step==="done"&&lastOrder){body.innerHTML=doneHTML();return}
  if(!its.length){step="bag";body.innerHTML=`<div class="empty-bag"><b>Sua sacola está vazia</b><p>Escolha seus produtos e eles aparecem aqui com o total e as formas de pagamento.</p><button class="btn-line" type="button" data-closebag="1">Ver produtos</button></div>`;return}
  let h="";
  if(step==="bag"){
    h=`<div class="stack">${bagItemsHTML()}</div><div class="sum"><div class="t"><span>Subtotal</span><span>${fmt(base)}</span></div><div class="note">No Pix: ${fmt(base)} · No cartão: até ${cardOptions(base).slice(-1)[0].n}x</div></div>
    <button class="btn-pay" type="button" data-step="checkout">${IC.lock}Finalizar compra</button>
    <button class="btn-line" type="button" data-closebag="1">Continuar comprando</button>
    <button class="rm" type="button" data-clear="1">Esvaziar sacola</button>`;
  }else{
    const e=custErrors();
    h=`<button class="back" type="button" data-step="bag">← Voltar para a sacola</button>
    <div class="stack mini">${items().map(x=>`<div class="mi2"><span>${x.q}× ${esc(B[x.p.brand].short)} ${esc(x.p.name)}</span><b>${fmt(x.p.price*x.q)}</b></div>`).join("")}</div>
    <div><div class="eyebrow mb8">Seus dados</div><div class="form">
     ${field("name","Nome completo",cust.name,"text","Nome e sobrenome")}
     ${field("cpf","CPF",cust.cpf,"text","000.000.000-00",'inputmode="numeric"')}
     ${field("phone","WhatsApp",cust.phone,"tel","(14) 99999-9999",'inputmode="tel"')}
     ${field("email","E-mail (opcional)",cust.email,"email","seuemail@exemplo.com")}
     <label class="chk${showErr&&e.consent?" bad":""}"><input type="checkbox" id="f_consent" ${consent?"checked":""}><span>Autorizo o uso dos meus dados apenas para processar este pedido e falar comigo sobre ele.</span></label></div></div>
    ${CFG.api?couponBox(base):""}
    ${payPicker(base)}
    ${err?`<div class="alert">${esc(err)}</div>`:""}
    <button class="btn-pay" type="button" data-submit="1" ${busy?"disabled":""}>${IC.lock}${busy?"Gerando pagamento…":pay==="pix"?"Gerar Pix do pedido":"Ir para o pagamento"}</button>
    <p class="note center">${CFG.api?"Você será levado ao pagamento seguro da InfinitePay, com confirmação automática.":"O pedido segue pelo WhatsApp para confirmação."}</p>`;
  }
  body.innerHTML=h;body.scrollTop=keep}
function doneHTML(){const o=lastOrder;
  let h=`<div class="done">${IC.ok}<h4>${o.url?"Abrindo o pagamento…":o.pay==="pix"?"Pedido criado! Falta só o Pix":"Pedido enviado"}</h4>${o.nsu?`<p>Pedido <b>${esc(o.nsu)}</b></p>`:""}${o.offline?`<p class="alert">Não conseguimos registrar o pedido no sistema agora. Pague normalmente e envie o comprovante pelo WhatsApp abaixo.</p>`:""}</div>`;
  if(o.url){h+=`<a class="btn-pay" href="${esc(o.url)}" rel="noopener">${IC.lock}${o.pay==="pix"?`Pagar ${fmt(o.total)} no Pix`:`Pagar ${fmt(o.total)} no cartão`}</a><p class="note center">${o.pay==="pix"?"Na página da InfinitePay, escolha <b>Pix</b>. A confirmação é automática, não precisa enviar comprovante.":`Na InfinitePay, escolha ${o.inst}x. A confirmação é automática.`} Se a página não abrir sozinha, toque no botão acima.</p>`}
  else if(o.pay==="pix"){const code=pixPayload(o.sub,o.nsu);
    h+=`<div class="pixbox"><div class="qr">${qrSvg(code)}</div><div class="note">Pix para <b>${esc(CFG.pix.holder)}</b> · <b>${fmt(o.sub)}</b></div>
    <textarea id="pixcode" readonly aria-label="Pix copia e cola" onfocus="this.select()">${code}</textarea>
    <button class="btn-line" type="button" data-copypix="1">Copiar Pix copia e cola</button>
    <p class="note">Pague no app do seu banco e envie o comprovante para confirmar o pedido.</p></div>
    <div class="sendbtns">${DATA.contacts.map(c=>`<a class="wa" target="_blank" rel="noopener" href="${waLink(c,orderMsg(c,o))}">${IC.wa}Enviar comprovante para ${esc(c.name)}</a>`).join("")}</div>`}
  else{h+=`<p class="note">O atendente confirma a disponibilidade e envia o link de pagamento do cartão.</p><div class="sendbtns">${DATA.contacts.map(c=>`<a class="wa" target="_blank" rel="noopener" href="${waLink(c,orderMsg(c,o))}">${IC.wa}Enviar pedido para ${esc(c.name)}</a>`).join("")}</div>`}
  h+=`<button class="btn-line" type="button" data-newbuy="1">Voltar ao catálogo</button>`;return h}
async function submitOrder(){
  showErr=true;readForm();const e=custErrors();if(Object.keys(e).length){renderBag();const f=$("#bagBody .bad input");if(f)f.focus();return}
  const sub=subtotal(),its=items(),disc=discount(sub),base=Math.round((sub-disc)*100)/100;const opts=cardOptions(base);const cc=opts.find(o=>o.n===inst)||opts[0];
  const ord={items:its,prod:sub,disc,cup:disc?coupon.code:"",sub:base,pay,inst:pay==="card"?cc.n:1,total:pay==="card"?cc.total:base,payLine:payLine(base),nsu:"",url:""};
  err="";
  if(CFG.api){busy=true;renderBag();
    try{const r=await fetch(CFG.api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"create",returnUrl:location.protocol==="https:"?location.href:"",order:{customer:{name:cust.name.trim(),cpf:cust.cpf,phone:cust.phone,email:cust.email.trim()},items:its.map(x=>({i:x.p.i,q:x.q})),pay,inst:ord.inst,consent:true,coupon:disc?coupon.code:""}})});
      const j=await r.json();busy=false;
      if(!j.ok&&j.couponError){coupon=null;cupMsg=j.error;renderBag();return}
      if(!j.ok){err=(j.error||"Não foi possível criar o pedido.")+" Você pode enviar o pedido pelo WhatsApp.";if(j.nsu)ord.nsu=j.nsu;ord.url="";if(pay==="card"){lastOrder=ord;finish();return}renderBag();return}
      ord.nsu=j.nsu;ord.url=j.url||"";if(j.total)ord.total=j.total;
    }catch(x){busy=false;ord.url="";ord.offline=true;if(pay==="card"){err="";lastOrder=ord;finish();return}}
  }
  lastOrder=ord;finish();
  if(ord.url)setTimeout(()=>{location.href=ord.url},900)}
function finish(){bag={};coupon=null;cupMsg="";save();$$(".pc").forEach(c=>syncCard(+c.dataset.i));step="done";updateBar();renderBag()}
function readForm(){const g=id=>{const e=$("#f_"+id);return e?e.value:null};["name","cpf","phone","email"].forEach(k=>{const v=g(k);if(v!=null)cust[k]=v});const c=$("#f_consent");if(c)consent=c.checked;const cu=$("#f_cup");if(cu)cupIn=cu.value;save()}
function updateBar(){const n=count();$$(".bagbtn .n").forEach(e=>e.textContent=n);$("#barTotal").textContent=fmt(subtotal());$("#barN").textContent=n+(n===1?" item":" itens");$("#bar").classList.toggle("on",n>0&&!isOpen("#bag")&&!isOpen("#pv"))}
const isOpen=s=>$(s).classList.contains("on");
function openSheet(s){$("#scrim").classList.add("on");const b=$(s);b.hidden=false;requestAnimationFrame(()=>b.classList.add("on"));updateBar();const x=b.querySelector(".x");if(x)x.focus({preventScroll:true})}
function openBag(toStep){if(toStep)step=toStep;else if(step==="done")step="bag";if(isOpen("#pv"))$("#pv").classList.remove("on");renderBag();openSheet("#bag")}
function closeAll(){["#bag","#pv"].forEach(s=>$(s).classList.remove("on"));$("#scrim").classList.remove("on");if(step==="done")step="bag";updateBar()}

/* ---------- página do produto ---------- */
let pvQty=1,pvI=-1;
function chips(a){return(a||[]).map(x=>`<span class="nt">${esc(x)}</span>`).join("")}
function infoHTML(p){const f=p.info;if(!f)return"";
  if(f.top||f.fam){return `<details class="acc" open><summary>Fragrância e notas ${IC.chev}</summary><div class="accb">
   ${f.fam?`<div class="fam"><small>Família olfativa</small><b>${esc(f.fam)}</b></div>`:""}
   <div class="pyr">${f.top?`<div><small>Notas de topo</small><div class="nts">${chips(f.top)}</div></div>`:""}${f.mid?`<div><small>Notas de coração</small><div class="nts">${chips(f.mid)}</div></div>`:""}${f.base?`<div><small>Notas de fundo</small><div class="nts">${chips(f.base)}</div></div>`:""}</div>
   ${f.uso?`<div class="fam"><small>Indicado para</small><b>${esc(f.uso)}</b></div>`:""}${f.note?`<p class="note">${esc(f.note[0].toUpperCase()+f.note.slice(1))}.</p>`:""}</div></details>`}
  return `<details class="acc" open><summary>Para que serve ${IC.chev}</summary><div class="accb">
   ${f.obj?`<div class="fam"><small>Objetivo</small><b>${esc(f.obj)}</b></div>`:""}
   ${f.ativos?`<div><small class="lbl">Principais ativos</small><div class="nts">${chips(f.ativos)}</div></div>`:""}
   ${f.tipo?`<div class="fam"><small>Indicado para</small><b>${esc(f.tipo)}</b></div>`:""}
   ${f.uso?`<div class="fam"><small>Como usar</small><span>${esc(f.uso)}</span></div>`:""}</div></details>`}
function pvRender(){const p=P[pvI],b=B[p.brand];const o=cardOptions(p.price),m=o[o.length-1];const off=p.old?Math.round((1-p.price/p.old)*100):0;const inBag=bag[pvI]||0;
  $("#pvBody").innerHTML=`<div class="pvg"><div class="pvimg"><img src="${IMG[pvI]}" alt="${esc(b.short+" "+p.name)}">${off?`<span class="tg off">-${off}%</span>`:""}</div>
  <div class="pvi"><div class="crumb">${CATN[catOf(p)]} · ${esc(b.short)}</div><h3>${esc(p.name)}</h3><div class="spec">${esc(p.spec)}</div>
  <div class="pvp">${p.old?`<s>${fmt(p.old)}</s>`:""}<strong>${fmt(p.price)}</strong></div>
  <div class="paybox"><div class="pay1"><b>Pix</b><span>${fmt(p.price)} à vista, sem acréscimo</span></div>
   <details class="pay1"><summary><b>Cartão de crédito</b><span>${m.n>1?`até ${m.n}x de ${fmt(m.par)}`:fmt(m.total)}</span>${IC.chev}</summary><table class="itab">${o.map(c=>`<tr><td>${c.n}x</td><td>${fmt(c.par)}</td><td>${fmt(c.total)}</td></tr>`).join("")}</table><p class="note">Valores com a taxa do cartão repassada.</p></details></div>
  <div class="qrow"><span class="lbl2">Quantidade</span>${stepper("pv",pvQty,"big")}</div>
  <div class="ctas2"><button class="add big" type="button" data-pvadd="1">${IC.plus}Adicionar à sacola${inBag?` (${inBag} na sacola)`:""}</button><button class="btn-pay" type="button" data-pvbuy="1">Comprar agora · ${fmt(p.price*pvQty)}</button></div>
  ${infoHTML(p)}
  <details class="acc"><summary>Informações do produto ${IC.chev}</summary><div class="accb"><p>${esc(p.desc||"")}</p><div class="fam"><small>Apresentação</small><span>${esc(p.spec)}</span></div></div></details>
  <a class="wa ghost" target="_blank" rel="noopener" href="${waLink(DATA.contacts[0],`Olá, ${DATA.contacts[0].name}! Vim pelo catálogo da CP Importados e tenho uma dúvida sobre:\n\n${lineOf(p,1)}`)}">${IC.wa}Falar com vendedor</a></div></div>
  <section class="rel"><div class="eyebrow">Relacionados</div><h4>Você também vai gostar</h4><div class="row-wrap"><button class="arrow l" type="button" aria-label="Anterior">‹</button><div class="track" id="relTrack"></div><button class="arrow r" type="button" aria-label="Próximo">›</button></div></section>`;
  fillRow($("#relTrack"),related(p));wireArrows($("#pv"))}
function openProd(i){pvI=i;pvQty=1;pvRender();if(isOpen("#bag"))$("#bag").classList.remove("on");openSheet("#pv");$("#pv .sh-b").scrollTop=0}

/* ---------- rotinas ---------- */
function renderRoutines(){const el=$("#routs");if(!el)return;el.innerHTML=DATA.routines.map(r=>{const its=r.ids.map(i=>P[i]);const tot=its.reduce((s,p)=>s+p.price,0);
  return `<article class="rt"><div><div class="eyebrow">Monte sua rotina</div><h3>${esc(r.title)}</h3><p>${esc(r.sub)}</p></div><ol>${its.map((p,k)=>`<li data-open="${p.i}"><div class="th"><img src="${thumb(p.i)}" alt="" width="56" height="70" loading="lazy" decoding="async"></div><div><b>${esc(p.name)}</b><small>${esc(r.steps[k]||"")}</small></div><span>${fmt(p.price)}</span></li>`).join("")}</ol>
  <div class="foot"><div><small style="color:var(--muted)">Rotina completa</small><br><strong>${fmt(tot)}</strong></div><button class="btn-gold" type="button" data-routine="${r.id}">Adicionar à sacola</button></div></article>`}).join("")}

/* ---------- simulador ---------- */
function sim(){const v=parseFloat(String($("#simv").value).replace(/\./g,"").replace(",","."))||0;const t=$("#simt");if(v<=0){t.innerHTML="";return}
  t.innerHTML=cardOptions(v).map(o=>`<tr><td>${o.n}x</td><td>${fmt(o.par)}</td><td>${fmt(o.total)}</td></tr>`).join("")}

/* ---------- retorno do pagamento ---------- */
function checkReturn(){const q=new URLSearchParams(location.search);const nsu=q.get("pedido")||q.get("order_nsu");if(!nsu)return;
  const paidHint=q.get("transaction_nsu")||q.get("receipt_url");
  bag={};save();
  lastOrder={nsu,pay:"done",items:[],sub:0};step="done";
  $("#bagBody").innerHTML=`<div class="done">${IC.ok}<h4>${paidHint?"Pagamento recebido!":"Obrigado pelo pedido!"}</h4><p>Pedido <b>${esc(nsu)}</b></p><p class="note" id="retSt">${paidHint?"Estamos confirmando com a InfinitePay…":"Assim que o pagamento for confirmado, avisamos pelo WhatsApp."}</p>${q.get("receipt_url")?`<a class="btn-line" href="${esc(q.get("receipt_url"))}" target="_blank" rel="noopener">Ver comprovante</a>`:""}<button class="btn-line" type="button" data-newbuy="1">Voltar ao catálogo</button></div>`;
  $("#bagT").textContent="Pedido";openSheet("#bag");
  if(CFG.api&&paidHint){fetch(CFG.api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"confirm",nsu,transaction_nsu:q.get("transaction_nsu"),slug:q.get("slug")})}).then(r=>r.json()).then(j=>{const e=$("#retSt");if(e)e.textContent=j.status==="Aprovado"?"Pagamento aprovado. Obrigado! Em breve entramos em contato.":"Recebemos seu retorno. Confirmaremos o pagamento em instantes."}).catch(()=>{})}
  try{history.replaceState(null,"",location.pathname)}catch(e){}}

/* ---------- eventos ---------- */
document.addEventListener("click",e=>{
  const t=e.target.closest("button,a,li[data-open]");if(!t)return;const d=t.dataset||{};
  if(d.add!=null)return setQty(+d.add,(bag[d.add]||0)+1);
  if(d.inc!=null){if(d.inc==="pv"){pvQty=Math.min(99,pvQty+1);return pvRender()}return setQty(+d.inc,(bag[d.inc]||0)+1)}
  if(d.dec!=null){if(d.dec==="pv"){pvQty=Math.max(1,pvQty-1);return pvRender()}return setQty(+d.dec,(bag[d.dec]||0)-1)}
  if(d.pvadd){setQty(pvI,(bag[pvI]||0)+pvQty);toast(`${pvQty} adicionado${pvQty>1?"s":""} à sacola`);pvQty=1;return pvRender()}
  if(d.pvbuy){setQty(pvI,(bag[pvI]||0)+pvQty);return openBag("checkout")}
  if(d.open!=null)return openProd(+d.open);
  if(d.cat!=null&&t.closest(".seg,.cats-nav,.catrow,.slide"))return goCat(d.cat,!t.closest(".seg"));
  if(d.pay){readForm();pay=d.pay==="card"?"card":"pix";save();return renderBag()}
  if(d.step){readForm();step=d.step;err="";showErr=false;renderBag();$("#bagBody").scrollTop=0;return}
  if(d.submit)return submitOrder();
  if(d.cupok)return applyCoupon();
  if(d.cuprm){readForm();coupon=null;cupMsg="";return renderBag()}
  if(d.copypix){const el=$("#pixcode");if(!el)return;const x=el.value;(navigator.clipboard?navigator.clipboard.writeText(x):Promise.reject()).then(()=>toast("Código Pix copiado"),()=>{el.focus();el.select();try{document.execCommand("copy");toast("Código Pix copiado")}catch(_){toast("Selecione e copie o código")}});return}
  if(d.clear){bag={};save();$$(".pc").forEach(c=>syncCard(+c.dataset.i));updateBar();renderBag();return toast("Sacola esvaziada")}
  if(d.routine){const r=DATA.routines.find(x=>x.id===d.routine);r.ids.forEach(i=>{bag[i]=(bag[i]||0)+1;syncCard(i)});save();updateBar();openBag("bag");return toast("Rotina adicionada")}
  if(d.openbag!=null)return openBag();
  if(d.newbuy!=null){step="bag";lastOrder=null;closeAll();$("#catalogo").scrollIntoView({behavior:"smooth"});return}
  if(d.closebag!=null||d.closeall!=null){closeAll();if(d.closebag!=null)$("#catalogo").scrollIntoView({behavior:"smooth"});return}
  if(d.more!=null){st.limit+=24;return apply()}
  if(t.classList.contains("ph")){const c=t.closest(".pc");if(c)return openProd(+c.dataset.i)}
});
document.addEventListener("input",e=>{const id=e.target.id;
  if(id==="f_cpf"){const v=maskCpf(e.target.value);e.target.value=v}
  if(id==="f_phone"){e.target.value=maskTel(e.target.value)}
  if(id&&id.startsWith("f_"))readForm();
  if(id==="simv")sim();
  if(id==="q"){st.q=norm(e.target.value).trim();st.limit=24;apply()}});
document.addEventListener("change",e=>{const id=e.target.id;if(id==="instSel"){readForm();inst=+e.target.value;save();renderBag()}
  if(id==="f_consent"){readForm()}
  if(id==="fBrand"){st.brand=e.target.value;st.limit=24;apply()}
  if(id==="fSort"){st.sort=e.target.value;st.limit=24;apply()}});
document.addEventListener("keydown",e=>{if(e.target.id==="f_cup"&&e.key==="Enter"){e.preventDefault();applyCoupon()}});
$("#q").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.target.blur();$("#catalogo").scrollIntoView({behavior:"smooth"})}});
$("#scrim").addEventListener("click",closeAll);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeAll()});

/* ---------- init ---------- */
renderRoutines();fillInst();
fillRow("rowBest",CFG.best);fillRow("rowOff",offerIds());fillRow("rowNew",newIds());wireArrows();
fillBrands();apply();sim();updateBar();
$$("#grid .pc").forEach(c=>syncCard(+c.dataset.i));
checkReturn();
if(location.hash==="#catalogo")setTimeout(()=>$("#catalogo").scrollIntoView(),50);
})();

