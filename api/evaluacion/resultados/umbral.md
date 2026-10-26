<!-- Generado por npm run en 2026-10-26T00:57:32.293Z. No editar a mano. -->

# Calibración del detector de republicaciones

## Pares de referencia

| Relación | Distancia | Puesto en similares | Misma ciudad | Precio menor / mayor | A | B |
|---|---|---|---|---|---|---|
| republicacion | 0.095 | 1 | sí | 0.99 | `REU-E041` moto 125 modelo 2019 papeles al dia | `REU-E070` Moto 125cc 2019 con soat y tecno |
| republicacion | 0.099 | 1 | sí | 0.97 | `REU-E027` Taladro percutor 1/2 pulgada | `REU-E068` Taladro percutor con maletin y brocas |
| republicacion | 0.112 | 1 | sí | 0.98 | `REU-E016` iPhone 13 Pro Max 256GB | `REU-E066` Celular Apple 13 Pro Max 256 gigas |
| republicacion | 0.137 | 1 | sí | 0.97 | `REU-E015` Portatil Lenovo i5 8GB RAM | `REU-E065` Portatil lenovo para estudiar o trabajar |
| republicacion | 0.143 | 1 | sí | 0.98 | `REU-E002` Nevera pequeña para apartaestudio | `REU-E062` Nevera 92 litros tipo minibar |
| republicacion | 0.160 | 1 | sí | 0.96 | `REU-E021` Bicicleta todoterreno rin 29 | `REU-E067` bici montañera rin 29 aluminio |
| republicacion | 0.181 | 1 | sí | 0.96 | `REU-E008` Sofa de 3 puestos tela gris | `REU-E063` Mueble de sala tres puestos |
| republicacion | 0.190 | 1 | sí | 0.94 | `REU-E030` Guitarra acustica con funda | `REU-E069` Guitarra de nylon para principiantes |
| republicacion | 0.249 | 1 | sí | 0.97 | `REU-E009` Closet de madera 2 puertas | `REU-E064` armario en madera con entrepaños |
| republicacion | 0.271 | 1 | sí | 0.96 | `REU-E001` Vendo calefactor casi nuevo barato | `REU-E061` Calefactor ceramico para habitacion |
| distinto | 0.439 | 5 | no | 0.53 | `REU-E010` Escritorio con cajonera | `REU-E011` mesa de comedor 4 sillas |
| distinto | 0.525 | 9 | no | 0.43 | `REU-E005` Microondas 20 litros poco uso | `REU-E006` Licuadora de vaso de vidrio |
| distinto | 0.575 | > 10 | no | 0.91 | `REU-E028` Pulidora angular 4 1/2 | `REU-E029` caja de herramientas 120 piezas |
| distinto | 0.591 | > 10 | no | 0.59 | `REU-E044` Alfombra grande para sala | `REU-E045` cortinas blackout dos paños |
| distinto | 0.645 | > 10 | no | 0.23 | `REU-E012` Cama doble con base cama | `REU-E013` Biblioteca 5 entrepaños |
| distinto | 0.651 | > 10 | no | 0.15 | `REU-E019` Teclado mecanico switches azules | `REU-E020` Televisor 43 pulgadas smart tv |
| distinto | 0.652 | > 10 | no | 0.12 | `REU-E022` Caminadora electrica plegable | `REU-E023` set de mancuernas 20 kilos |
| distinto | 0.655 | > 10 | no | 0.60 | `REU-E036` Guacal para perro mediano | `REU-E038` acuario 60 litros con filtro |
| distinto | 0.687 | > 10 | no | 0.74 | `REU-E017` Monitor 24 pulgadas full hd | `REU-E018` impresora multifuncional epson |
| distinto | 0.709 | > 10 | no | 0.23 | `REU-E003` lavadora 10 kilos marca haceb | `REU-E004` Estufa de 4 puestos a gas |

Desfase máximo entre la distancia calculada aquí y la que devuelve Weaviate: 1.43e-7.

## Las tres reglas

| Regla | Corte | Republicaciones detectadas | Controles marcados | Pares distintos marcados | Publicaciones con insignia falsa |
|---|---|---|---|---|---|
| A1 · solo distancia, corte de los 20 pares de referencia | 0.355 (hueco 0.271–0.439) | 10/10 | 0/10 | 36 | 59 |
| A2 · solo distancia, corte con todo el catálogo | 0.208 (solapan: 2 FN, 1 FP) | 8/10 | 0/10 | 1 | 2 |
| B · distancia + misma ciudad + precio a ±20 % (calibrada) | 0.293 (hueco 0.271–0.315) | 10/10 | 0/10 | 0 | 0 |
| **Vigente** en `src/motor/umbral.js` (distancia < 0.29, tolerancia 0.8) | 0.29 | 10/10 | 0/10 | 0 | 0 |

## Sensibilidad

Republicaciones detectadas / pares distintos marcados.

| Corte | Solo distancia | Misma ciudad + precio ≥ 70 % | Misma ciudad + precio ≥ 80 % | Misma ciudad + precio ≥ 90 % |
|---|---|---|---|---|
| 0.20 | 8/10 · 1 | 8/10 · 0 | 8/10 · 0 | 8/10 · 0 |
| 0.25 | 9/10 · 3 | 9/10 · 0 | 9/10 · 0 | 9/10 · 0 |
| 0.30 | 10/10 · 15 | 10/10 · 0 | 10/10 · 0 | 10/10 · 0 |
| 0.35 | 10/10 · 36 | 10/10 · 1 | 10/10 · 1 | 10/10 · 1 |
| 0.40 | 10/10 · 87 | 10/10 · 3 | 10/10 · 2 | 10/10 · 2 |
| 0.45 | 10/10 · 220 | 10/10 · 13 | 10/10 · 9 | 10/10 · 2 |

## Todo el catálogo

272 publicaciones, 36856 pares.

| Pares distintos | Distancia |
|---|---|
| mínimo | 0.157 |
| percentil 1 | 0.476 |
| percentil 5 | 0.557 |
| mediana | 0.690 |

## Pares distintos por debajo de 0.32 (revisados a mano)

| Distancia | A | B | ¿Insignia con la regla vigente? |
|---|---|---|---|
| 0.157 | `REU-D043` Consola de videojuegos con 4 mandos · Medellin · $1.250.000 | `REU-E051` Consola de videojuegos con dos mandos · Bogota · $950.000 | no |
| 0.225 | `REU-E053` colchon sencillo ortopedico · Cali · $280.000 | `REU-D042` Colchon doble ortopedico · Bogota · $680.000 | no |
| 0.234 | `REU-E038` acuario 60 litros con filtro · Cali · $200.000 | `REU-A063` Acuario plantado 100 litros · Bogota · $780.000 | no |
| 0.251 | `REU-A007` Cama nido con cajones · Bogota · $520.000 | `REU-A045` Base cama sencilla con cajones · Tunja · $280.000 | no |
| 0.252 | `REU-E011` mesa de comedor 4 sillas · Cali · $400.000 | `REU-J009` juego de comedor 6 puestos · Medellin · $750.000 | no |
| 0.255 | `REU-A033` comics y novelas graficas · Medellin · $200.000 | `REU-E040` Saga completa de novelas · Bogota · $220.000 | no |
| 0.273 | `REU-E031` Teclado musical 61 teclas · Bogota · $310.000 | `REU-A025` Piano digital 88 teclas · Bogota · $1.600.000 | no |
| 0.277 | `REU-A001` Licuadora industrial 2 litros · Bucaramanga · $290.000 | `REU-E006` Licuadora de vaso de vidrio · Tunja · $65.000 | no |
| 0.288 | `REU-E056` ventilador de techo con control · Villavicencio · $160.000 | `REU-A005` Ventilador de torre silencioso · Cali · $140.000 | no |
| 0.288 | `REU-J001` Estufa industrial 2 puestos · Bogota · $420.000 | `REU-E047` Estufa electrica portatil 2 puestos · Sogamoso · $75.000 | no |
| 0.289 | `REU-D001` Lavadora secadora dos en uno · Bogota · $1.450.000 | `REU-A002` Secadora de ropa 22 libras · Bogota · $890.000 | no |
| 0.291 | `REU-E015` Portatil Lenovo i5 8GB RAM · Bogota · $1.450.000 | `REU-J014` portatil hp para estudiar · Tunja · $1.100.000 | no |
| 0.293 | `REU-A036` Estufa de leña para finca · Duitama · $450.000 | `REU-J001` Estufa industrial 2 puestos · Bogota · $420.000 | no |
| 0.295 | `REU-E065` Portatil lenovo para estudiar o trabajar · Bogota · $1.400.000 | `REU-J014` portatil hp para estudiar · Tunja · $1.100.000 | no |
| 0.297 | `REU-D018` casco de ciclismo talla M · Bogota · $85.000 | `REU-J034` Casco para moto certificado · Bogota · $260.000 | no |
| 0.302 | `REU-E005` Microondas 20 litros poco uso · Bogota · $150.000 | `REU-J037` Horno microondas grande 34 litros · Medellin · $280.000 | no |
| 0.304 | `REU-A012` mouse inalambrico ergonomico · Tunja · $70.000 | `REU-A049` Teclado y mouse inalambricos · Bogota · $80.000 | no |
| 0.313 | `REU-E026` silla para carro de bebe · Cali · $150.000 | `REU-D047` asiento elevador para niñ · Villavicencio · $80.000 | no |
| 0.315 | `REU-E012` Cama doble con base cama · Bogota · $620.000 | `REU-D042` Colchon doble ortopedico · Bogota · $680.000 | no |
| 0.320 | `REU-J061` Enciclopedia de medicina 4 tomos · Sogamoso · $230.000 | `REU-A065` diccionario enciclopedico ilustrado · Sogamoso · $80.000 | no |
