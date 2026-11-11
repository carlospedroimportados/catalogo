
/* ===== CONFIGURAÇÃO (ajuste aqui) =====
   api: endereço do servidor de pedidos (Google Apps Script). Vazio = pedidos seguem pelo WhatsApp.
   best: produtos em "Mais vendidos", na ordem.
   fees: taxa (%) do cartão no Link de Pagamento InfinitePay, repassada ao cliente.
   minParcela: parcela mínima em R$. */
const CFG={api:"https://script.google.com/macros/s/AKfycbw1h3q90999q70J7BlFx_kDTcjGY7luxLWdN0o6lFqo3Vy90J-xTzqSyeeD6_H8sABS/exec",best:[102, 101, 57, 61, 74, 56, 59, 103, 100, 132],newFrom:119,kitFrom:132,minParcela:30,
 fees:{"1": 4.2, "2": 6.09, "3": 7.01, "4": 7.91, "5": 8.8, "6": 9.67, "7": 12.59, "8": 13.42, "9": 14.25, "10": 15.06, "11": 15.87, "12": 16.66},
 pix:{key:"carlospedroimportados@gmail.com",name:"CARLOS DA SILVA JUNIOR",city:"GARCA",holder:"Carlos da Silva Junior"}};
