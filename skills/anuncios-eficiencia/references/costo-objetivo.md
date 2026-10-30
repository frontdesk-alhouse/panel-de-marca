# Costo objetivo: cuánto puede pagar el negocio por un lead

> El corte de todo el skill. Un CPL "caro" o "barato" no existe en abstracto: existe contra lo que
> deja una venta y cuántos leads hacen falta para cerrarla. Script: `scripts/costo_objetivo.py`.

## Fórmulas

| Concepto | Fórmula | Qué significa |
|---|---|---|
| Utilidad bruta por cliente | ticket × margen bruto × compras por cliente | Lo que queda para pagar la adquisición |
| **CPA máximo** (equilibrio) | = utilidad bruta por cliente | Pagar esto por cliente es trabajar gratis |
| **CPL máximo** | CPA máximo × tasa de cierre | Lo más que se puede pagar por un lead |
| CPA / CPL objetivo | máximo × (1 − colchón) | Lo que se usa para decidir; colchón típico 20-40 % |
| ROAS de equilibrio | 1 ÷ margen | Ingreso atribuido por cada peso de anuncio para no perder |
| Leads por venta | 1 ÷ tasa de cierre | Cuántos leads hay que pagar por cada venta |

- **Margen bruto**, no precio: ticket menos costo directo (material, comisión, honorario del
  especialista). No el margen neto después de renta y sueldos, salvo que el dueño quiera ser
  conservador.
- **Tasa de cierre** de lead a venta, del CRM o de la libreta. Si no hay, una estimación honesta
  (preguntar: "de cada 10 que te escriben, ¿cuántos compran?") y se marca como estimada.
- **Compras por cliente**: solo si la recompra es real y cercana (limpiezas, mensualidades). Para
  arrancar, 1.

## Ejemplos en MXN (ficticios)

### Consultorio dental, implantes y limpiezas
Ticket promedio $4,500 · margen 45 % · cierre 20 % (1 de cada 5)

- Utilidad por cliente: 4,500 × 0.45 = **$2,025** → CPA máximo
- CPL máximo: 2,025 × 0.20 = **$405**
- CPL objetivo con 30 % de colchón: **$283.50**
- ROAS de equilibrio: 1 / 0.45 = **2.22×**

Una campaña con CPL de $250 está bien; una con CPL de $1,380 pierde dinero en cada venta, por más que
"traiga leads".

### Taller mecánico, servicio mayor
Ticket $3,200 · margen 35 % · cierre 40 % · 2 visitas al año por cliente

- Utilidad por cliente: 3,200 × 0.35 × 2 = $2,240
- CPL máximo: 2,240 × 0.40 = $896 · objetivo (30 %): $627

### Tienda en línea de ropa
Ticket $850 · margen 50 % · la "tasa de cierre" no aplica (se mide compra directa)

- CPA máximo: $425 · objetivo: $297.50 · ROAS de equilibrio: 2.0×
- Aquí la puja se hace por compra (CPA o ROAS), no por lead.

### Despacho contable, iguala mensual
Ticket $2,800 al mes · margen 60 % · cierre 15 % · 10 meses de permanencia promedio

- Utilidad por cliente: 2,800 × 0.60 × 10 = $16,800
- CPL máximo: $2,520 · objetivo (40 % de colchón por incertidumbre): $1,512
- Ojo: con permanencia larga el CPL "tolerable" sube mucho; usarlo solo si la permanencia está
  medida, y vigilar el flujo de caja (se paga hoy, se recupera en meses).

## Cómo se usa

1. Se calcula con el dueño, en la primera sesión.
2. `analizar_export.py --cpl-objetivo N` marca lo que está arriba.
3. Las reglas de pausa usan múltiplos de este número (`reglas-pausa-escala.md`).
4. La meta de CPA en Smart Bidding se pone cerca del CPA real y se baja hacia el objetivo por pasos.
5. Se recalcula cada trimestre o cuando cambie precio, margen o la forma de vender.

## Errores comunes

- Usar el precio en lugar del margen: infla el CPL tolerable 2 a 3 veces.
- Usar el CPL promedio de un estudio de otro país.
- No separar leads de venta: un CPL bajo con cierre de 2 % sale más caro que un CPL alto con cierre
  de 30 %. El número que manda es el **costo por venta**.
- Olvidar que WhatsApp sin respuesta rápida baja la tasa de cierre y por lo tanto el CPL máximo.
