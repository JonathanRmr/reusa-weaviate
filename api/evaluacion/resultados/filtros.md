<!-- Generado por npm run en 2026-10-26T00:57:45.495Z. No editar a mano. -->

# Filtros combinados con la búsqueda

## Integridad

| Filtro | Cumplen en el catálogo | `equal` ingenuo | Filtro de la API |
|---|---|---|---|
| estado = nuevo | 3 | 76 | 3 |
| estado = como nuevo | 73 | 73 | 73 |
| estado = usado | 195 | 195 | 195 |
| estado = para repuestos | 1 | 1 | 1 |
| ciudad = Duitama | 15 | — | 15 |
| electrodomesticos y precio ≤ 150.000 | 16 | — | 16 |
| precio ≤ 50.000 | 12 | — | 12 |
| precio ≥ 2.000.000 | 6 | — | 6 |
| ciudad = "bogotá" (tal como la teclea un usuario) | 75 | 0 | 75 |

## Recall de nearText con filtro (limit 12)

| Consulta | Filtro | Cumplen | Esperados | Obtenidos | Recall | Mismo orden | Distancia del primero |
|---|---|---|---|---|---|---|---|
| algo para calentar la sala | sin filtro | 272 | 12 | 12 | 1.00 | sí | 0.592 |
| algo para calentar la sala | ciudad = Duitama | 15 | 12 | 12 | 1.00 | sí | 0.749 |
| algo para calentar la sala | electrodomesticos y precio ≤ 150.000 | 16 | 12 | 12 | 1.00 | sí | 0.672 |
| algo para calentar la sala | precio ≤ 50.000 | 12 | 12 | 12 | 1.00 | sí | 0.749 |
| algo para calentar la sala | precio ≥ 2.000.000 | 6 | 6 | 6 | 1.00 | sí | 0.817 |
| algo para calentar la sala | estado = nuevo | 3 | 3 | 3 | 1.00 | sí | 0.866 |
| algo para calentar la sala | estado = para repuestos | 1 | 1 | 1 | 1.00 | sí | 0.822 |
| mueble para guardar ropa | sin filtro | 272 | 12 | 12 | 1.00 | sí | 0.513 |
| mueble para guardar ropa | ciudad = Duitama | 15 | 12 | 12 | 1.00 | sí | 0.625 |
| mueble para guardar ropa | electrodomesticos y precio ≤ 150.000 | 16 | 12 | 12 | 1.00 | sí | 0.743 |
| mueble para guardar ropa | precio ≤ 50.000 | 12 | 12 | 12 | 1.00 | sí | 0.609 |
| mueble para guardar ropa | precio ≥ 2.000.000 | 6 | 6 | 6 | 1.00 | sí | 0.879 |
| mueble para guardar ropa | estado = nuevo | 3 | 3 | 3 | 1.00 | sí | 0.867 |
| mueble para guardar ropa | estado = para repuestos | 1 | 1 | 1 | 1.00 | sí | 0.990 |
| para trabajar desde la casa | sin filtro | 272 | 12 | 12 | 1.00 | sí | 0.768 |
| para trabajar desde la casa | ciudad = Duitama | 15 | 12 | 12 | 1.00 | sí | 0.783 |
| para trabajar desde la casa | electrodomesticos y precio ≤ 150.000 | 16 | 12 | 12 | 1.00 | sí | 0.866 |
| para trabajar desde la casa | precio ≤ 50.000 | 12 | 12 | 12 | 1.00 | sí | 0.858 |
| para trabajar desde la casa | precio ≥ 2.000.000 | 6 | 6 | 6 | 1.00 | sí | 0.917 |
| para trabajar desde la casa | estado = nuevo | 3 | 3 | 3 | 1.00 | sí | 0.920 |
| para trabajar desde la casa | estado = para repuestos | 1 | 1 | 1 | 1.00 | sí | 0.966 |
