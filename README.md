# NEFA Workspace · versión 2

Dashboard de De China al Mundo para Next.js y Firebase. Rediseño completo con siete secciones: resumen, operaciones, clientes, finanzas bancarias, caja, marketing y empresa.

## Actualizar desde GitHub (sin instalar nada en tu PC)

1. Hacé una copia de tus datos desde la versión actual, si la tenés disponible.
2. Descomprimí `NEFA_ACTUALIZACION_GITHUB.zip`.
3. En `Nexusldk/dashboard`, elegí **Add file → Upload files**.
4. Arrastrá **el contenido** de la carpeta `NEFA`: `app`, `lib`, `tests`, `public` y los archivos de configuración de la raíz. `package.json` debe quedar en la raíz, no dentro de otra carpeta NEFA.
5. Confirmá **Commit changes**. Aceptá el reemplazo de los archivos existentes.
6. Vercel instalará la nueva dependencia ExcelJS automáticamente porque se incluyen `package.json` y `package-lock.json`.
7. Verificá **Framework Preset: Next.js**, **Root Directory: raíz** y **Output Directory: automático, Override apagado**. El archivo `vercel.json` también declara Next.js.
8. Esperá a que termine el nuevo deployment. Si usás Redeploy, hacelo sin la caché de compilación.

No hay que eliminar colecciones ni modificar registros existentes. No se incluyen credenciales de administración, una exportación de la base ni el extracto privado en el repositorio.

## Importar el extracto de Galicia

1. Abrí **Finanzas bancarias → Importar extracto**.
2. Escribí la cuenta propia (por defecto `Galicia · CC 1511970403`). Usá siempre la misma identificación para la misma cuenta.
3. Seleccioná `Extracto_CC1511970403.xlsx` desde tu computadora. No lo subas a GitHub.
4. Revisá la vista previa. Cada fila se puede seleccionar, deseleccionar y editar con el lápiz.
5. Confirmá **Importar movimientos**. Recién entonces se escriben los registros en Firebase.

### Qué se importa

- Fecha → fecha del movimiento.
- Créditos → **Ingreso**, importe positivo.
- Débitos → **Egreso**, importe positivo.
- Descripción → concepto.
- Leyendas adicionales 1 → contraparte, cuando existe.
- Leyendas adicionales 4 → entidad, sólo si contiene un nombre; los códigos numéricos no se convierten en bancos inventados.
- Medio y categoría → sugerencia a partir de la descripción y la entidad. Son editables.
- Referencia, cuenta y notas quedan disponibles para editar.

El importador reconoce encabezados dentro de la hoja; no depende de que estén en la primera fila. Lee fechas Excel y fechas de texto. No evalúa fórmulas ni macros. Si una fila tiene una fecha inválida, montos ambiguos o débito y crédito positivos simultáneamente, aparece rechazada con su número de fila. Las filas totalmente vacías no se importan. Archivos admitidos: `.xlsx`, hasta 15 MB. Para `.xls`, guardá una copia `.xlsx` en Excel/LibreOffice.

### Duplicados y recuperación

Cada movimiento importado recibe un identificador derivado de la cuenta y sus datos originales. Al importar de nuevo el mismo extracto, los registros existentes se omiten **sin sobrescribir las ediciones**. Se distingue la primera, segunda, etc. aparición de movimientos completamente idénticos para conservar operaciones legítimas repetidas. Esta detección se aplica a las filas creadas por este importador; no identifica automáticamente registros cargados a mano por versiones anteriores.

Las importaciones se guardan en transacciones de hasta 50 registros. Si falla un lote posterior, los anteriores pueden haber quedado guardados; el mensaje lo informa. Reintentá el mismo archivo: los registros ya guardados se omiten.

Para archivos de períodos superpuestos con movimientos exactamente iguales, verificá las filas repetidas en la vista previa; si el banco cambia los textos de un movimiento entre exportaciones, puede recibir otra identidad. Si borrás un registro importado, una importación posterior puede volver a crearlo.

## Editar datos

El lápiz permite editar los campos de movimientos bancarios, caja, clientes/operaciones, campañas y socios. Los datos de empresa se editan desde **Mi empresa → Editar empresa**. El botón de papelera pide confirmación antes de borrar. No se editan los identificadores técnicos ni el origen de importación.

Los clientes y las operaciones conservan la colección `contracts` del sistema anterior: son dos vistas del mismo registro comercial. Cada fila corresponde a un cliente/operación, no a un cliente único. El número de teléfono y el email son nuevos campos opcionales.

Las operaciones ahora guardan la fecha estimada `eta` y el estado logístico sin reemplazarlos por la fecha de edición. Si el sistema anterior no guardó el ETA real, hay que completarlo; el rediseño no lo reconstruye.

## Importes y filtros

- Bancos y caja en ARS. Operaciones en USD. No se convierten ni suman monedas distintas.
- **Flujo neto = ingresos − egresos** de los movimientos incluidos. No es el saldo bancario: no incorpora un saldo inicial ni movimientos fuera del archivo.
- Caja y bancos se administran por separado para evitar sumar dos veces una misma transferencia.
- Filtros bancarios: texto, fechas, tipo y medio. Los totales del filtro y el CSV usan los mismos movimientos.
- El gráfico agrupa por mes los últimos seis meses que tengan registros.
- CSV con separador `;`, UTF-8 y protección contra fórmulas; puede abrirse desde LibreOffice/Excel seleccionando la configuración decimal correspondiente.

## Firebase

Se mantiene el proyecto original `nefa-dashboard` y estas rutas:

```
empresa_nefa/datos/transactions
empresa_nefa/datos/contracts
empresa_nefa/datos/bankTransactions
empresa_nefa/datos/partners
empresa_nefa/datos/marketing
empresa_nefa/datos/company/info
```

No hay que configurar variables de entorno nuevas. Se conserva la autenticación anónima original. Este cambio no modifica reglas, proveedores de autenticación ni permisos de Firebase; si el backend rechaza el acceso, ahora muestra el error en pantalla. No uses reglas públicas como solución rápida para datos comerciales.

Las imágenes de campañas pueden cargarse por URL o como JPG/PNG/WebP de hasta 600 KB; el límite deja espacio para los demás campos del documento Firestore.

## Demostración

Agregá `?demo=1` a la URL. Muestra datos ficticios y permite probar altas, ediciones, borrados e importación **sólo en memoria**. No llama a Firebase para leer o escribir datos. Al recargar se reinicia. La demostración no es un respaldo ni un modo de trabajo sin conexión.

## Respaldo

**Mi empresa → Descargar respaldo** exporta la información cargada en JSON. Es una descarga; esta versión no implementa restauración automática del JSON.

## Desarrollo

Requiere Node.js compatible con Next.js 14 (se recomienda Node 22 LTS).

```sh
npm ci
npm test
npm run build
npm run dev
```

La dependencia de importación se carga sólo cuando se selecciona un archivo.
