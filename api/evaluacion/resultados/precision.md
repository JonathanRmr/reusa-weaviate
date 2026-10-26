<!-- Generado por npm run en 2026-10-26T00:57:55.183Z. No editar a mano. -->

# Precision@5 por alpha

| α | modo | P@5 | P@5 / techo | P@5 semántica | P@5 exacta | MRR | MRR semántica | MRR exacta | mediana ms |
|---|---|---|---|---|---|---|---|---|---|
| 0 | bm25 | 0.18 | 0.33 | 0.15 | 0.30 | 0.45 | 0.31 | 1.00 | 92 |
| 0.25 | hybrid | 0.24 | 0.39 | 0.23 | 0.30 | 0.55 | 0.43 | 1.00 | 122 |
| 0.5 | hybrid | 0.30 | 0.45 | 0.30 | 0.30 | 0.64 | 0.55 | 1.00 | 124 |
| 0.65 | hybrid | 0.32 | 0.47 | 0.33 | 0.30 | 0.71 | 0.64 | 1.00 | 122 |
| 0.75 | hybrid | 0.36 | 0.53 | 0.38 | 0.30 | 0.72 | 0.65 | 1.00 | 122 |
| 1 | vector | 0.42 | 0.60 | 0.45 | 0.30 | 0.73 | 0.67 | 1.00 | 124 |

## Por consulta (P@5, techo entre paréntesis)

| Consulta | grupo | techo | α=0 | α=0.25 | α=0.5 | α=0.65 | α=0.75 | α=1 |
|---|---|---|---|---|---|---|---|---|
| algo para calentar la sala | semantica | 0.6 | 0.0 | 0.0 | 0.0 | 0.0 | 0.2 | 0.4 |
| mueble para guardar ropa | semantica | 1.0 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 |
| para trabajar desde la casa | semantica | 1.0 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 |
| algo para hacer ejercicio en la casa | semantica | 1.0 | 0.0 | 0.4 | 0.4 | 0.4 | 0.4 | 0.6 |
| donde pongo a dormir al bebe | semantica | 0.6 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 |
| algo para refrescar la habitacion cuando hace calor | semantica | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| quiero aprender a tocar un instrumento | semantica | 1.0 | 0.2 | 0.4 | 0.6 | 0.6 | 0.8 | 1.0 |
| algo para mantener fria la comida | semantica | 1.0 | 0.0 | 0.0 | 0.4 | 0.6 | 0.6 | 0.6 |
| iPhone 13 Pro Max 256GB | exacta | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 |
| botas talla 39 | exacta | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 |

## Top 5 de cada corrida

✓ = relevante según el juicio de `evaluacion/consultas.js`.

### "algo para calentar la sala" — α = 0 (bm25) — P@5 0.00, RR 0.00

1. ✗ `REU-E044` Alfombra grande para sala — score 4.779
2. ✗ `REU-E005` Microondas 20 litros poco uso — score 3.062
3. ✗ `REU-E007` ventilador de pie 3 velocidades — score 2.812
4. ✗ `REU-D041` mesa auxiliar de centro — score 2.397
5. ✗ `REU-D032` Libros de cocina ilustrados — score 2.352

### "algo para calentar la sala" — α = 0.25 (hybrid) — P@5 0.00, RR 0.00

1. ✗ `REU-E044` Alfombra grande para sala — score 0.886
2. ✗ `REU-E005` Microondas 20 litros poco uso — score 0.536
3. ✗ `REU-E007` ventilador de pie 3 velocidades — score 0.479
4. ✗ `REU-E063` Mueble de sala tres puestos — score 0.463
5. ✗ `REU-D041` mesa auxiliar de centro — score 0.381

### "algo para calentar la sala" — α = 0.5 (hybrid) — P@5 0.00, RR 0.13

1. ✗ `REU-E044` Alfombra grande para sala — score 0.773
2. ✗ `REU-A024` pistola de calor con boquillas — score 0.515
3. ✗ `REU-E005` Microondas 20 litros poco uso — score 0.486
4. ✗ `REU-E007` ventilador de pie 3 velocidades — score 0.431
5. ✗ `REU-E063` Mueble de sala tres puestos — score 0.420

### "algo para calentar la sala" — α = 0.65 (hybrid) — P@5 0.00, RR 0.14

1. ✗ `REU-E044` Alfombra grande para sala — score 0.704
2. ✗ `REU-A024` pistola de calor con boquillas — score 0.660
3. ✗ `REU-J065` plancha para cabello ceramica — score 0.495
4. ✗ `REU-E005` Microondas 20 litros poco uso — score 0.456
5. ✗ `REU-E007` ventilador de pie 3 velocidades — score 0.402

### "algo para calentar la sala" — α = 0.75 (hybrid) — P@5 0.20, RR 0.25

1. ✗ `REU-A024` pistola de calor con boquillas — score 0.757
2. ✗ `REU-E044` Alfombra grande para sala — score 0.659
3. ✗ `REU-J065` plancha para cabello ceramica — score 0.549
4. ✓ `REU-E001` Vendo calefactor casi nuevo barato — score 0.441
5. ✗ `REU-E005` Microondas 20 litros poco uso — score 0.436

### "algo para calentar la sala" — α = 1 (vector) — P@5 0.40, RR 0.33

1. ✗ `REU-A024` pistola de calor con boquillas — dist 0.592
2. ✗ `REU-J065` plancha para cabello ceramica — dist 0.672
3. ✓ `REU-E001` Vendo calefactor casi nuevo barato — dist 0.696
4. ✓ `REU-E061` Calefactor ceramico para habitacion — dist 0.703
5. ✗ `REU-E044` Alfombra grande para sala — dist 0.707

### "mueble para guardar ropa" — α = 0 (bm25) — P@5 0.20, RR 0.50

1. ✗ `REU-A006` mueble para television flotante — score 5.115
2. ✓ `REU-E064` armario en madera con entrepaños — score 4.375
3. ✗ `REU-J041` tendedero de ropa plegable — score 4.291
4. ✗ `REU-A002` Secadora de ropa 22 libras — score 3.453
5. ✗ `REU-E050` plancha de ropa a vapor — score 3.330

### "mueble para guardar ropa" — α = 0.25 (hybrid) — P@5 0.20, RR 0.50

1. ✗ `REU-A006` mueble para television flotante — score 0.885
2. ✓ `REU-E064` armario en madera con entrepaños — score 0.880
3. ✗ `REU-J041` tendedero de ropa plegable — score 0.777
4. ✗ `REU-A002` Secadora de ropa 22 libras — score 0.577
5. ✗ `REU-A039` Organizador de zapatos bajo cama — score 0.537

### "mueble para guardar ropa" — α = 0.5 (hybrid) — P@5 0.20, RR 1.00

1. ✓ `REU-E064` armario en madera con entrepaños — score 0.920
2. ✗ `REU-A006` mueble para television flotante — score 0.771
3. ✗ `REU-J041` tendedero de ropa plegable — score 0.732
4. ✗ `REU-A039` Organizador de zapatos bajo cama — score 0.590
5. ✗ `REU-A002` Secadora de ropa 22 libras — score 0.513

### "mueble para guardar ropa" — α = 0.65 (hybrid) — P@5 0.20, RR 1.00

1. ✓ `REU-E064` armario en madera con entrepaños — score 0.944
2. ✗ `REU-J041` tendedero de ropa plegable — score 0.705
3. ✗ `REU-A006` mueble para television flotante — score 0.702
4. ✗ `REU-A039` Organizador de zapatos bajo cama — score 0.621
5. ✗ `REU-A002` Secadora de ropa 22 libras — score 0.475

### "mueble para guardar ropa" — α = 0.75 (hybrid) — P@5 0.20, RR 1.00

1. ✓ `REU-E064` armario en madera con entrepaños — score 0.960
2. ✗ `REU-J041` tendedero de ropa plegable — score 0.687
3. ✗ `REU-A006` mueble para television flotante — score 0.656
4. ✗ `REU-A039` Organizador de zapatos bajo cama — score 0.643
5. ✗ `REU-E063` Mueble de sala tres puestos — score 0.486

### "mueble para guardar ropa" — α = 1 (vector) — P@5 0.20, RR 1.00

1. ✓ `REU-E064` armario en madera con entrepaños — dist 0.513
2. ✗ `REU-A039` Organizador de zapatos bajo cama — dist 0.609
3. ✗ `REU-J041` tendedero de ropa plegable — dist 0.625
4. ✗ `REU-D011` Puff otomana con almacenamiento — dist 0.652
5. ✗ `REU-E063` Mueble de sala tres puestos — dist 0.655

### "para trabajar desde la casa" — α = 0 (bm25) — P@5 0.60, RR 1.00

1. ✓ `REU-E065` Portatil lenovo para estudiar o trabajar — score 8.186
2. ✓ `REU-E014` silla ergonomica de oficina — score 5.409
3. ✗ `REU-A064` Casa para perro en madera — score 3.959
4. ✓ `REU-E017` Monitor 24 pulgadas full hd — score 2.744
5. ✗ `REU-J003` olla arrocera grande — score 2.466

### "para trabajar desde la casa" — α = 0.25 (hybrid) — P@5 0.60, RR 1.00

1. ✓ `REU-E065` Portatil lenovo para estudiar o trabajar — score 0.882
2. ✓ `REU-E014` silla ergonomica de oficina — score 0.721
3. ✗ `REU-A064` Casa para perro en madera — score 0.550
4. ✗ `REU-E023` set de mancuernas 20 kilos — score 0.303
5. ✓ `REU-E017` Monitor 24 pulgadas full hd — score 0.300

### "para trabajar desde la casa" — α = 0.5 (hybrid) — P@5 0.60, RR 1.00

1. ✓ `REU-E014` silla ergonomica de oficina — score 0.814
2. ✓ `REU-E065` Portatil lenovo para estudiar o trabajar — score 0.764
3. ✗ `REU-A064` Casa para perro en madera — score 0.666
4. ✗ `REU-E023` set de mancuernas 20 kilos — score 0.442
5. ✓ `REU-E010` Escritorio con cajonera — score 0.374

### "para trabajar desde la casa" — α = 0.65 (hybrid) — P@5 0.60, RR 1.00

1. ✓ `REU-E014` silla ergonomica de oficina — score 0.870
2. ✗ `REU-A064` Casa para perro en madera — score 0.736
3. ✓ `REU-E065` Portatil lenovo para estudiar o trabajar — score 0.693
4. ✗ `REU-E023` set de mancuernas 20 kilos — score 0.525
5. ✓ `REU-E010` Escritorio con cajonera — score 0.444

### "para trabajar desde la casa" — α = 0.75 (hybrid) — P@5 0.60, RR 1.00

1. ✓ `REU-E014` silla ergonomica de oficina — score 0.907
2. ✗ `REU-A064` Casa para perro en madera — score 0.782
3. ✓ `REU-E065` Portatil lenovo para estudiar o trabajar — score 0.646
4. ✗ `REU-E023` set de mancuernas 20 kilos — score 0.580
5. ✓ `REU-E010` Escritorio con cajonera — score 0.492

### "para trabajar desde la casa" — α = 1 (vector) — P@5 0.60, RR 1.00

1. ✓ `REU-E014` silla ergonomica de oficina — dist 0.768
2. ✗ `REU-A064` Casa para perro en madera — dist 0.783
3. ✗ `REU-E023` set de mancuernas 20 kilos — dist 0.810
4. ✓ `REU-A012` mouse inalambrico ergonomico — dist 0.821
5. ✓ `REU-E010` Escritorio con cajonera — dist 0.826

### "algo para hacer ejercicio en la casa" — α = 0 (bm25) — P@5 0.00, RR 0.17

1. ✗ `REU-A064` Casa para perro en madera — score 5.198
2. ✗ `REU-J003` olla arrocera grande — score 3.000
3. ✗ `REU-D002` Batidora de pedestal con bowl — score 2.917
4. ✗ `REU-E014` silla ergonomica de oficina — score 2.847
5. ✗ `REU-D003` molino de maiz manual — score 2.831

### "algo para hacer ejercicio en la casa" — α = 0.25 (hybrid) — P@5 0.40, RR 0.33

1. ✗ `REU-A064` Casa para perro en madera — score 0.865
2. ✗ `REU-A048` Proyector hd para cine en casa — score 0.583
3. ✓ `REU-E023` set de mancuernas 20 kilos — score 0.555
4. ✗ `REU-D002` Batidora de pedestal con bowl — score 0.487
5. ✓ `REU-D020` Pesas rusas kettlebell 16 kg — score 0.461

### "algo para hacer ejercicio en la casa" — α = 0.5 (hybrid) — P@5 0.40, RR 0.50

1. ✗ `REU-A064` Casa para perro en madera — score 0.731
2. ✓ `REU-E023` set de mancuernas 20 kilos — score 0.703
3. ✗ `REU-D002` Batidora de pedestal con bowl — score 0.520
4. ✗ `REU-A048` Proyector hd para cine en casa — score 0.519
5. ✓ `REU-D020` Pesas rusas kettlebell 16 kg — score 0.493

### "algo para hacer ejercicio en la casa" — α = 0.65 (hybrid) — P@5 0.40, RR 1.00

1. ✓ `REU-E023` set de mancuernas 20 kilos — score 0.792
2. ✗ `REU-A064` Casa para perro en madera — score 0.650
3. ✗ `REU-D002` Batidora de pedestal con bowl — score 0.539
4. ✗ `REU-A016` Gimnasio didactico para bebe — score 0.533
5. ✓ `REU-D020` Pesas rusas kettlebell 16 kg — score 0.512

### "algo para hacer ejercicio en la casa" — α = 0.75 (hybrid) — P@5 0.40, RR 1.00

1. ✓ `REU-E023` set de mancuernas 20 kilos — score 0.852
2. ✗ `REU-A016` Gimnasio didactico para bebe — score 0.615
3. ✗ `REU-A064` Casa para perro en madera — score 0.596
4. ✗ `REU-D002` Batidora de pedestal con bowl — score 0.552
5. ✓ `REU-D020` Pesas rusas kettlebell 16 kg — score 0.525

### "algo para hacer ejercicio en la casa" — α = 1 (vector) — P@5 0.60, RR 1.00

1. ✓ `REU-E023` set de mancuernas 20 kilos — dist 0.612
2. ✗ `REU-A016` Gimnasio didactico para bebe — dist 0.650
3. ✗ `REU-D002` Batidora de pedestal con bowl — dist 0.700
4. ✓ `REU-A020` Banco de pesas con barra — dist 0.703
5. ✓ `REU-D020` Pesas rusas kettlebell 16 kg — dist 0.706

### "donde pongo a dormir al bebe" — α = 0 (bm25) — P@5 0.20, RR 0.50

1. ✗ `REU-A016` Gimnasio didactico para bebe — score 4.517
2. ✓ `REU-E025` Corral de bebe plegable — score 3.174
3. ✗ `REU-J050` caminador para bebe musical — score 3.156
4. ✗ `REU-A051` Monitor de bebe con camara — score 3.068
5. ✗ `REU-E024` Coche para bebe tres posiciones — score 2.942

### "donde pongo a dormir al bebe" — α = 0.25 (hybrid) — P@5 0.20, RR 0.33

1. ✗ `REU-A016` Gimnasio didactico para bebe — score 0.971
2. ✗ `REU-E024` Coche para bebe tres posiciones — score 0.661
3. ✓ `REU-E025` Corral de bebe plegable — score 0.657
4. ✗ `REU-A051` Monitor de bebe con camara — score 0.614
5. ✗ `REU-J050` caminador para bebe musical — score 0.612

### "donde pongo a dormir al bebe" — α = 0.5 (hybrid) — P@5 0.20, RR 0.33

1. ✗ `REU-A016` Gimnasio didactico para bebe — score 0.942
2. ✗ `REU-E024` Coche para bebe tres posiciones — score 0.774
3. ✓ `REU-E025` Corral de bebe plegable — score 0.699
4. ✗ `REU-A051` Monitor de bebe con camara — score 0.644
5. ✗ `REU-E026` silla para carro de bebe — score 0.628

### "donde pongo a dormir al bebe" — α = 0.65 (hybrid) — P@5 0.20, RR 0.33

1. ✗ `REU-A016` Gimnasio didactico para bebe — score 0.924
2. ✗ `REU-E024` Coche para bebe tres posiciones — score 0.842
3. ✓ `REU-E025` Corral de bebe plegable — score 0.724
4. ✗ `REU-A051` Monitor de bebe con camara — score 0.662
5. ✗ `REU-E026` silla para carro de bebe — score 0.658

### "donde pongo a dormir al bebe" — α = 0.75 (hybrid) — P@5 0.20, RR 0.33

1. ✗ `REU-A016` Gimnasio didactico para bebe — score 0.913
2. ✗ `REU-E024` Coche para bebe tres posiciones — score 0.887
3. ✓ `REU-E025` Corral de bebe plegable — score 0.740
4. ✗ `REU-E026` silla para carro de bebe — score 0.678
5. ✗ `REU-A051` Monitor de bebe con camara — score 0.674

### "donde pongo a dormir al bebe" — α = 1 (vector) — P@5 0.20, RR 0.33

1. ✗ `REU-E024` Coche para bebe tres posiciones — dist 0.699
2. ✗ `REU-A016` Gimnasio didactico para bebe — dist 0.731
3. ✓ `REU-E025` Corral de bebe plegable — dist 0.759
4. ✗ `REU-E026` silla para carro de bebe — dist 0.774
5. ✗ `REU-D049` Canguro ergonomico para cargar bebe — dist 0.776

### "algo para refrescar la habitacion cuando hace calor" — α = 0 (bm25) — P@5 0.00, RR 0.00

1. ✗ `REU-J039` Humidificador para habitacion — score 5.125
2. ✗ `REU-A024` pistola de calor con boquillas — score 4.899
3. ✗ `REU-E002` Nevera pequeña para apartaestudio — score 4.822
4. ✗ `REU-D065` deshumidificador para habitacion — score 4.641
5. ✗ `REU-E061` Calefactor ceramico para habitacion — score 4.249

### "algo para refrescar la habitacion cuando hace calor" — α = 0.25 (hybrid) — P@5 0.00, RR 0.13

1. ✗ `REU-J039` Humidificador para habitacion — score 0.971
2. ✗ `REU-A024` pistola de calor con boquillas — score 0.962
3. ✗ `REU-E002` Nevera pequeña para apartaestudio — score 0.848
4. ✗ `REU-D065` deshumidificador para habitacion — score 0.816
5. ✗ `REU-E061` Calefactor ceramico para habitacion — score 0.792

### "algo para refrescar la habitacion cuando hace calor" — α = 0.5 (hybrid) — P@5 0.00, RR 0.14

1. ✗ `REU-A024` pistola de calor con boquillas — score 0.975
2. ✗ `REU-J039` Humidificador para habitacion — score 0.941
3. ✗ `REU-E061` Calefactor ceramico para habitacion — score 0.782
4. ✗ `REU-E002` Nevera pequeña para apartaestudio — score 0.764
5. ✗ `REU-D065` deshumidificador para habitacion — score 0.742

### "algo para refrescar la habitacion cuando hace calor" — α = 0.65 (hybrid) — P@5 0.00, RR 0.14

1. ✗ `REU-A024` pistola de calor con boquillas — score 0.982
2. ✗ `REU-J039` Humidificador para habitacion — score 0.924
3. ✗ `REU-E061` Calefactor ceramico para habitacion — score 0.775
4. ✗ `REU-E002` Nevera pequeña para apartaestudio — score 0.714
5. ✗ `REU-D065` deshumidificador para habitacion — score 0.697

### "algo para refrescar la habitacion cuando hace calor" — α = 0.75 (hybrid) — P@5 0.00, RR 0.13

1. ✗ `REU-A024` pistola de calor con boquillas — score 0.987
2. ✗ `REU-J039` Humidificador para habitacion — score 0.912
3. ✗ `REU-E061` Calefactor ceramico para habitacion — score 0.771
4. ✗ `REU-E002` Nevera pequeña para apartaestudio — score 0.680
5. ✗ `REU-D065` deshumidificador para habitacion — score 0.668

### "algo para refrescar la habitacion cuando hace calor" — α = 1 (vector) — P@5 0.00, RR 0.17

1. ✗ `REU-A024` pistola de calor con boquillas — dist 0.593
2. ✗ `REU-J039` Humidificador para habitacion — dist 0.622
3. ✗ `REU-D036` Vitrina refrigerada para negocio — dist 0.646
4. ✗ `REU-E061` Calefactor ceramico para habitacion — dist 0.651
5. ✗ `REU-D037` Dispensador de agua fria y caliente — dist 0.653

### "quiero aprender a tocar un instrumento" — α = 0 (bm25) — P@5 0.20, RR 0.33

1. ✗ `REU-D054` Interfaz de audio dos canales — score 2.444
2. ✗ `REU-D059` libros infantiles ilustrados — score 2.382
3. ✓ `REU-E031` Teclado musical 61 teclas — score 2.295
4. ✗ `REU-A044` escritorio pequeño para estudiar — score 1.225
5. ✗ `REU-A019` Guantes de boxeo 14 onzas — score 1.183

### "quiero aprender a tocar un instrumento" — α = 0.25 (hybrid) — P@5 0.40, RR 1.00

1. ✓ `REU-E031` Teclado musical 61 teclas — score 0.933
2. ✗ `REU-D054` Interfaz de audio dos canales — score 0.827
3. ✗ `REU-D059` libros infantiles ilustrados — score 0.733
4. ✗ `REU-A044` escritorio pequeño para estudiar — score 0.276
5. ✓ `REU-E069` Guitarra de nylon para principiantes — score 0.200

### "quiero aprender a tocar un instrumento" — α = 0.5 (hybrid) — P@5 0.60, RR 1.00

1. ✓ `REU-E031` Teclado musical 61 teclas — score 0.955
2. ✗ `REU-D054` Interfaz de audio dos canales — score 0.653
3. ✗ `REU-D059` libros infantiles ilustrados — score 0.503
4. ✓ `REU-E069` Guitarra de nylon para principiantes — score 0.401
5. ✓ `REU-A025` Piano digital 88 teclas — score 0.304

### "quiero aprender a tocar un instrumento" — α = 0.65 (hybrid) — P@5 0.60, RR 1.00

1. ✓ `REU-E031` Teclado musical 61 teclas — score 0.969
2. ✗ `REU-D054` Interfaz de audio dos canales — score 0.549
3. ✓ `REU-E069` Guitarra de nylon para principiantes — score 0.521
4. ✓ `REU-A025` Piano digital 88 teclas — score 0.381
5. ✗ `REU-D059` libros infantiles ilustrados — score 0.365

### "quiero aprender a tocar un instrumento" — α = 0.75 (hybrid) — P@5 0.80, RR 1.00

1. ✓ `REU-E031` Teclado musical 61 teclas — score 0.978
2. ✓ `REU-E069` Guitarra de nylon para principiantes — score 0.601
3. ✗ `REU-D054` Interfaz de audio dos canales — score 0.480
4. ✓ `REU-A025` Piano digital 88 teclas — score 0.433
5. ✓ `REU-D026` saxofon alto con estuche — score 0.389

### "quiero aprender a tocar un instrumento" — α = 1 (vector) — P@5 1.00, RR 1.00

1. ✓ `REU-E031` Teclado musical 61 teclas — dist 0.647
2. ✓ `REU-E069` Guitarra de nylon para principiantes — dist 0.709
3. ✓ `REU-A025` Piano digital 88 teclas — dist 0.783
4. ✓ `REU-D026` saxofon alto con estuche — dist 0.796
5. ✓ `REU-J028` violin 4/4 con estuche — dist 0.809

### "algo para mantener fria la comida" — α = 0 (bm25) — P@5 0.00, RR 0.00

1. ✗ `REU-D037` Dispensador de agua fria y caliente — score 4.827
2. ✗ `REU-D029` Cobija termica doble faz — score 2.906
3. ✗ `REU-E046` Juego de sabanas doble algodon — score 2.800
4. ✗ `REU-D027` Abrigo de invierno con capota — score 2.591
5. ✗ `REU-J032` Jaula para aves mediana — score 1.437

### "algo para mantener fria la comida" — α = 0.25 (hybrid) — P@5 0.00, RR 0.17

1. ✗ `REU-D037` Dispensador de agua fria y caliente — score 1.000
2. ✗ `REU-D029` Cobija termica doble faz — score 0.540
3. ✗ `REU-D027` Abrigo de invierno con capota — score 0.413
4. ✗ `REU-E046` Juego de sabanas doble algodon — score 0.388
5. ✗ `REU-J051` Silla de comer para bebe — score 0.333

### "algo para mantener fria la comida" — α = 0.5 (hybrid) — P@5 0.40, RR 0.33

1. ✗ `REU-D037` Dispensador de agua fria y caliente — score 1.000
2. ✗ `REU-D029` Cobija termica doble faz — score 0.536
3. ✓ `REU-D068` Mini nevera para carro — score 0.509
4. ✓ `REU-D036` Vitrina refrigerada para negocio — score 0.496
5. ✗ `REU-D011` Puff otomana con almacenamiento — score 0.480

### "algo para mantener fria la comida" — α = 0.65 (hybrid) — P@5 0.60, RR 0.50

1. ✗ `REU-D037` Dispensador de agua fria y caliente — score 1.000
2. ✓ `REU-D036` Vitrina refrigerada para negocio — score 0.645
3. ✗ `REU-D011` Puff otomana con almacenamiento — score 0.624
4. ✓ `REU-D068` Mini nevera para carro — score 0.616
5. ✓ `REU-J005` Nevecon dos puertas no frost — score 0.613

### "algo para mantener fria la comida" — α = 0.75 (hybrid) — P@5 0.60, RR 0.50

1. ✗ `REU-D037` Dispensador de agua fria y caliente — score 1.000
2. ✓ `REU-D036` Vitrina refrigerada para negocio — score 0.744
3. ✗ `REU-D011` Puff otomana con almacenamiento — score 0.720
4. ✓ `REU-J005` Nevecon dos puertas no frost — score 0.707
5. ✓ `REU-D068` Mini nevera para carro — score 0.688

### "algo para mantener fria la comida" — α = 1 (vector) — P@5 0.60, RR 0.50

1. ✗ `REU-D037` Dispensador de agua fria y caliente — dist 0.654
2. ✓ `REU-D036` Vitrina refrigerada para negocio — dist 0.655
3. ✗ `REU-D011` Puff otomana con almacenamiento — dist 0.662
4. ✓ `REU-J005` Nevecon dos puertas no frost — dist 0.665
5. ✓ `REU-D068` Mini nevera para carro — dist 0.679

### "iPhone 13 Pro Max 256GB" — α = 0 (bm25) — P@5 0.40, RR 1.00

1. ✓ `REU-E016` iPhone 13 Pro Max 256GB — score 20.718
2. ✓ `REU-E066` Celular Apple 13 Pro Max 256 gigas — score 13.117
3. ✗ `REU-E059` Bateria de carro 13 placas — score 3.782
4. ✗ `REU-E015` Portatil Lenovo i5 8GB RAM — score 2.188

### "iPhone 13 Pro Max 256GB" — α = 0.25 (hybrid) — P@5 0.40, RR 1.00

1. ✓ `REU-E016` iPhone 13 Pro Max 256GB — score 1.000
2. ✓ `REU-E066` Celular Apple 13 Pro Max 256 gigas — score 0.680
3. ✗ `REU-E059` Bateria de carro 13 placas — score 0.101
4. ✗ `REU-A010` Celular Samsung 128GB — score 0.074
5. ✗ `REU-D015` memoria usb 128 gigas — score 0.073

### "iPhone 13 Pro Max 256GB" — α = 0.5 (hybrid) — P@5 0.40, RR 1.00

1. ✓ `REU-E016` iPhone 13 Pro Max 256GB — score 1.000
2. ✓ `REU-E066` Celular Apple 13 Pro Max 256 gigas — score 0.769
3. ✗ `REU-A010` Celular Samsung 128GB — score 0.147
4. ✗ `REU-D015` memoria usb 128 gigas — score 0.146
5. ✗ `REU-J014` portatil hp para estudiar — score 0.119

### "iPhone 13 Pro Max 256GB" — α = 0.65 (hybrid) — P@5 0.40, RR 1.00

1. ✓ `REU-E016` iPhone 13 Pro Max 256GB — score 1.000
2. ✓ `REU-E066` Celular Apple 13 Pro Max 256 gigas — score 0.823
3. ✗ `REU-A010` Celular Samsung 128GB — score 0.191
4. ✗ `REU-D015` memoria usb 128 gigas — score 0.190
5. ✗ `REU-J014` portatil hp para estudiar — score 0.155

### "iPhone 13 Pro Max 256GB" — α = 0.75 (hybrid) — P@5 0.40, RR 1.00

1. ✓ `REU-E016` iPhone 13 Pro Max 256GB — score 1.000
2. ✓ `REU-E066` Celular Apple 13 Pro Max 256 gigas — score 0.859
3. ✗ `REU-A010` Celular Samsung 128GB — score 0.221
4. ✗ `REU-D015` memoria usb 128 gigas — score 0.219
5. ✗ `REU-J014` portatil hp para estudiar — score 0.179

### "iPhone 13 Pro Max 256GB" — α = 1 (vector) — P@5 0.40, RR 1.00

1. ✓ `REU-E016` iPhone 13 Pro Max 256GB — dist 0.309
2. ✓ `REU-E066` Celular Apple 13 Pro Max 256 gigas — dist 0.343
3. ✗ `REU-A010` Celular Samsung 128GB — dist 0.779
4. ✗ `REU-D015` memoria usb 128 gigas — dist 0.781
5. ✗ `REU-J014` portatil hp para estudiar — dist 0.817

### "botas talla 39" — α = 0 (bm25) — P@5 0.20, RR 1.00

1. ✓ `REU-J057` Botas de cuero talla 39 — score 10.977
2. ✗ `REU-E034` Botas de seguridad talla 42 — score 6.667
3. ✗ `REU-A061` Sudadera deportiva talla l — score 2.701
4. ✗ `REU-D028` Tenis deportivos talla 40 — score 2.682
5. ✗ `REU-D056` uniformes escolares talla 12 — score 2.609

### "botas talla 39" — α = 0.25 (hybrid) — P@5 0.20, RR 1.00

1. ✓ `REU-J057` Botas de cuero talla 39 — score 1.000
2. ✗ `REU-E034` Botas de seguridad talla 42 — score 0.596
3. ✗ `REU-D028` Tenis deportivos talla 40 — score 0.246
4. ✗ `REU-E054` Patines en linea talla 38 — score 0.222
5. ✗ `REU-A062` jeans talla 32 varios — score 0.200

### "botas talla 39" — α = 0.5 (hybrid) — P@5 0.20, RR 1.00

1. ✓ `REU-J057` Botas de cuero talla 39 — score 1.000
2. ✗ `REU-E034` Botas de seguridad talla 42 — score 0.629
3. ✗ `REU-D028` Tenis deportivos talla 40 — score 0.335
4. ✗ `REU-E054` Patines en linea talla 38 — score 0.318
5. ✗ `REU-D017` Bicicleta de ruta talla 54 — score 0.253

### "botas talla 39" — α = 0.65 (hybrid) — P@5 0.20, RR 1.00

1. ✓ `REU-J057` Botas de cuero talla 39 — score 1.000
2. ✗ `REU-E034` Botas de seguridad talla 42 — score 0.649
3. ✗ `REU-D028` Tenis deportivos talla 40 — score 0.388
4. ✗ `REU-E054` Patines en linea talla 38 — score 0.376
5. ✗ `REU-D017` Bicicleta de ruta talla 54 — score 0.287

### "botas talla 39" — α = 0.75 (hybrid) — P@5 0.20, RR 1.00

1. ✓ `REU-J057` Botas de cuero talla 39 — score 1.000
2. ✗ `REU-E034` Botas de seguridad talla 42 — score 0.662
3. ✗ `REU-D028` Tenis deportivos talla 40 — score 0.424
4. ✗ `REU-E054` Patines en linea talla 38 — score 0.414
5. ✗ `REU-E021` Bicicleta todoterreno rin 29 — score 0.325

### "botas talla 39" — α = 1 (vector) — P@5 0.20, RR 1.00

1. ✓ `REU-J057` Botas de cuero talla 39 — dist 0.410
2. ✗ `REU-E034` Botas de seguridad talla 42 — dist 0.567
3. ✗ `REU-D028` Tenis deportivos talla 40 — dist 0.662
4. ✗ `REU-E054` Patines en linea talla 38 — dist 0.663
5. ✗ `REU-E021` Bicicleta todoterreno rin 29 — dist 0.705

