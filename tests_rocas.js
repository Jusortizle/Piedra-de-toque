// Uso: node tests_rocas.js   (sin dependencias; lee el motor desde index.html)
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const ini = html.indexOf('/*ENGINE_START*/'), fin = html.indexOf('/*ENGINE_END*/');
if (ini < 0 || fin < 0) { console.error('No se encontró el motor en index.html'); process.exit(1); }
const E = new Function(html.slice(ini, fin) + `;return {VOC, BASE, MINERALES, PELIGROS, DUREZA_OPCIONES, KIND_FISICO,
  calcular, banda, evaluar, razones, mercado, seguridad, sugerirPruebas, densidadSumergida, densidadDesplazamiento,
  nitidez, exposicion, juzgarFoto, validarIA, promptIA, resumenAciertos, porId};`)();

let ok = 0, fallos = [];
function prueba(nombre, fn) {
  try { fn(); ok++; } catch (e) { fallos.push(nombre + ' → ' + e.message); }
}
function afirmar(cond, msg) { if (!cond) throw new Error(msg || 'afirmación falsa'); }
function cerca(a, b, tol, msg) { if (Math.abs(a - b) > tol) throw new Error((msg || 'valor') + ': ' + a + ' no está a ±' + tol + ' de ' + b); }
const p = (post, id) => post.find(x => x.id === id).p;
const KIT = { iman: true, porcelana: true, moneda: true, cuchillo: true, vidrio: true, vinagre: true, bascula: true };
const o = (k, v, extra) => Object.assign({ k, v, src: 'usuario' }, extra);

// ---------- Integridad de la base ----------
prueba('la base tiene al menos 90 entradas', () => afirmar(E.BASE.length >= 90, 'hay ' + E.BASE.length));
prueba('ids únicos y prioridades positivas', () => {
  const ids = new Set();
  for (const m of E.BASE) { afirmar(!ids.has(m.id), 'id repetido ' + m.id); ids.add(m.id); afirmar(m.p > 0, 'prior ' + m.id); }
});
prueba('rangos de dureza y densidad válidos', () => {
  for (const m of E.BASE) {
    afirmar(m.h[0] <= m.h[1] && m.h[0] >= 1 && m.h[1] <= 10, 'dureza ' + m.id);
    afirmar(m.d[0] <= m.d[1] && m.d[0] > 0, 'densidad ' + m.id);
  }
});
prueba('todos los términos pertenecen al vocabulario', () => {
  const mapa = { brillo: 'brillo', color: 'color', raya: 'raya', transp: 'transp', habito: 'habito', mag: 'mag', fizz: 'fizz', mal: 'mal' };
  for (const m of E.BASE) {
    for (const k of Object.keys(mapa)) for (const t of m.tk[k].main.concat(m.tk[k].alt)) afirmar(E.VOC[k][t], m.id + ' ' + k + ' ' + t);
    afirmar(m.tk.brillo.main.length > 0 && m.tk.color.main.length > 0 && m.tk.raya.main.length > 0, 'sin término principal en ' + m.id);
    for (const r of m.rgset) afirmar(E.VOC.rasgo[r], m.id + ' rasgo ' + r);
    for (const t of m.pel) afirmar(E.PELIGROS[t], m.id + ' peligro ' + t);
    for (const c of m.eco) afirmar(['gema', 'mena', 'esp', 'orn'].includes(c), m.id + ' eco ' + c);
  }
});
prueba('los minerales peligrosos conocidos están marcados', () => {
  const tag = id => E.porId(id).pel;
  afirmar(tag('arsenopirita').includes('arsenico') && tag('cinabrio').includes('mercurio') && tag('galena').includes('plomo') && tag('uraninita').includes('uranio') && tag('crisotilo').includes('asbesto'), 'faltan etiquetas');
});

// ---------- Motor de hipótesis ----------
prueba('la distribución suma 1 y no hay NaN', () => {
  for (const obs of [[], [o('color', 'verde')], [o('dureza', [9, 10]), o('densidad', [30, 31]), o('mag', 'fuerte')]]) {
    const post = E.calcular(obs);
    cerca(post.reduce((s, x) => s + x.p, 0), 1, 1e-9, 'suma');
    afirmar(post.every(x => Number.isFinite(x.p) && x.p >= 0), 'NaN');
    afirmar(post.some(x => x.id === 'otro'), 'falta Otro');
  }
});
prueba('ejemplo del enunciado: sin atracción magnética baja la magnetita y sube la hematita', () => {
  const base = [o('brillo', 'metalico'), o('color', 'negro'), o('transp', 'opaco')];
  const antes = E.calcular(base), despues = E.calcular(base.concat([o('mag', 'ninguno')]));
  afirmar(p(despues, 'magnetita') < p(antes, 'magnetita') * 0.25, 'magnetita no bajó lo suficiente');
  afirmar(p(despues, 'hematita') > p(antes, 'hematita'), 'hematita no subió');
  afirmar(p(despues, 'magnetita') < p(despues, 'hematita'), 'orden final incorrecto');
});
prueba('una atracción fuerte deja a la magnetita arriba', () => {
  const post = E.calcular([o('brillo', 'metalico'), o('color', 'negro'), o('transp', 'opaco'), o('mag', 'fuerte')]);
  afirmar(post[0].id === 'magnetita', 'primero: ' + post[0].id);
});
prueba('la raya roja distingue hematita aunque sea negra y metálica', () => {
  const post = E.calcular([o('brillo', 'metalico'), o('color', 'negro'), o('raya', 'roja'), o('mag', 'ninguno')]);
  afirmar(post[0].id === 'hematita', 'primero: ' + post[0].id);
});
prueba('pirita frente a oro: dura y quebradiza descarta el oro', () => {
  const obs = [o('brillo', 'metalico'), o('color', 'dorado'), o('transp', 'opaco'), o('dureza', [6, 7]), o('mal', 'quebradizo')];
  const post = E.calcular(obs);
  afirmar(post[0].id === 'pirita', 'primero: ' + post[0].id);
  afirmar(p(post, 'oro') < 0.01, 'oro ' + p(post, 'oro'));
});
prueba('oro: blando, maleable y muy denso lo sitúa primero con confianza alta', () => {
  const obs = [o('brillo', 'metalico'), o('color', 'dorado'), o('dureza', [2.5, 3.5]), o('mal', 'maleable'), o('densidad', [17, 19.5])];
  const post = E.calcular(obs);
  afirmar(post[0].id === 'oro' && post[0].p > 0.8, 'oro ' + p(post, 'oro'));
  afirmar(E.banda(post, obs).nivel === 'alta', 'banda ' + E.banda(post, obs).nivel);
});
prueba('calcita: burbujas claras, dureza 3 y raya blanca', () => {
  const obs = [o('brillo', 'vitreo'), o('color', 'blanco'), o('fizz', 'fuerte'), o('dureza', [2.5, 3.5]), o('raya', 'blanca')];
  const post = E.calcular(obs);
  afirmar(post[0].id === 'calcita' && post[0].p > 0.6, 'calcita ' + p(post, 'calcita'));
});
prueba('una medición incompatible con todo hace crecer «Otro»', () => {
  const normal = p(E.calcular([o('color', 'verde')]), 'otro');
  const raro = p(E.calcular([o('color', 'verde'), o('dureza', [9, 10]), o('densidad', [14, 15]), o('mag', 'fuerte')]), 'otro');
  afirmar(raro > normal * 3, 'otro ' + normal + ' → ' + raro);
});
prueba('las sugerencias de la IA pesan menos que las confirmadas', () => {
  const user = E.calcular([o('color', 'azul'), o('transp', 'translucido')]);
  const ia = E.calcular([o('color', 'azul', { src: 'ia' }), o('transp', 'translucido', { src: 'ia' })]);
  const maxUser = Math.max(...user.filter(x => x.id !== 'otro').map(x => x.p)), maxIA = Math.max(...ia.filter(x => x.id !== 'otro').map(x => x.p));
  afirmar(maxIA < maxUser, 'IA ' + maxIA + ' vs usuario ' + maxUser);
});
prueba('una observación repetida de una prueba reemplaza, no suma', () => {
  const a = E.calcular([o('mag', 'fuerte')]), b = E.calcular([o('mag', 'fuerte'), o('mag', 'fuerte')]);
  cerca(p(a, 'magnetita'), p(b, 'magnetita'), 1e-9, 'magnetita');
});

// ---------- Confianza ----------
prueba('solo con observación visual la confianza es baja', () => {
  const obs = [o('brillo', 'vitreo'), o('color', 'violeta'), o('habito', 'prismatico'), o('transp', 'transparente'), o('rasgo', 'caras_planas')];
  afirmar(E.banda(E.calcular(obs), obs).nivel === 'baja', 'banda');
});
prueba('una sola prueba física no pasa de media', () => {
  const obs = [o('brillo', 'metalico'), o('color', 'dorado'), o('mag', 'ninguno')];
  afirmar(E.banda(E.calcular(obs), obs).nivel !== 'alta', 'no debería ser alta');
});

// ---------- Interés, mercado y seguridad ----------
prueba('un granito típico es COMÚN', () => {
  const obs = [o('brillo', 'vitreo'), o('color', 'blanco'), o('habito', 'masivo'), o('rasgo', 'granos_gruesos')];
  afirmar(E.evaluar(E.calcular(obs), obs).nivel === 'comun', E.evaluar(E.calcular(obs), obs).nivel);
});
prueba('hierro pesado y magnético con costra y huellas: ¿NO ALTERAR o al menos INTERESANTE?, sin dar por hecho el meteorito', () => {
  const obs = [o('color', 'negro'), o('transp', 'opaco'), o('rasgo', 'costra'), o('rasgo', 'regmaglipto'), o('mag', 'fuerte'), o('densidad', [7.4, 7.8])];
  const post = E.calcular(obs), ev = E.evaluar(post, obs);
  afirmar(['interesante', 'noalterar'].includes(ev.nivel), 'nivel ' + ev.nivel);
  afirmar(post[0].id !== 'meteorito_hierro' || post[0].p < 0.5, 'demasiado seguro de que es un meteorito');
  afirmar(E.razones(post).some(r => r.id === 'meteorito_hierro'), 'no lista el meteorito como razón para no botarla');
});
prueba('la marca manual NO ALTERAR fuerza ese nivel', () => {
  const obs = [o('color', 'blanco')];
  afirmar(E.evaluar(E.calcular(obs), obs, { noAlterarManual: true }).nivel === 'noalterar', 'nivel');
});
prueba('un prisma azul translúcido con dureza 8 apunta a una gema delicada', () => {
  const obs = [o('brillo', 'vitreo'), o('color', 'incoloro'), o('transp', 'transparente'), o('habito', 'prismatico'), o('dureza', [7, 10]), o('densidad', [3.45, 3.6]), o('rasgo', 'exfoliacion')];
  const post = E.calcular(obs), ev = E.evaluar(post, obs);
  afirmar(post[0].id === 'topacio', 'primero ' + post[0].id);
  afirmar(ev.nivel === 'noalterar', 'nivel ' + ev.nivel);
});
prueba('sulfuros metálicos con raya negra sugieren interés geológico', () => {
  const obs = [o('brillo', 'metalico'), o('color', 'dorado'), o('raya', 'negra'), o('dureza', [3.5, 5.5]), o('rasgo', 'irisado')];
  const ev = E.evaluar(E.calcular(obs), obs);
  afirmar(ev.geo !== 'bajo', 'geo ' + ev.geo);
});
prueba('solo con observación visual no se declara potencial económico ni alto interés geológico', () => {
  const obs = [o('brillo', 'metalico'), o('color', 'dorado'), o('transp', 'opaco'), o('habito', 'masivo')];
  const ev = E.evaluar(E.calcular(obs), obs);
  afirmar(ev.nivel !== 'eco' && ev.nivel !== 'geo', 'nivel ' + ev.nivel);
});
prueba('sin pruebas físicas no se estima valor', () => {
  const obs = [o('brillo', 'vitreo'), o('color', 'violeta')];
  afirmar(!E.mercado(E.calcular(obs), obs).estimable, 'estimable');
});
prueba('la app nunca devuelve precios', () => {
  const obs = [o('brillo', 'vitreo'), o('color', 'violeta'), o('dureza', [7, 7.5])];
  afirmar(!/\$|US\$|USD|COP/.test(JSON.stringify(E.mercado(E.calcular(obs), obs))), 'aparece un precio');
});
prueba('seguridad: arsenopirita avisa de arsénico', () => {
  const obs = [o('brillo', 'metalico'), o('color', 'plateado'), o('raya', 'negra'), o('dureza', [5.5, 6]), o('densidad', [5.9, 6.2])];
  afirmar(E.seguridad(E.calcular(obs), obs).some(s => s.tag === 'arsenico'), 'sin aviso');
});
prueba('seguridad: un hábito fibroso siempre avisa de asbesto', () => {
  const obs = [o('habito', 'fibroso'), o('color', 'blanco')];
  afirmar(E.seguridad(E.calcular(obs), obs).some(s => s.tag === 'asbesto'), 'sin aviso');
});
prueba('seguridad: sin riesgos no hay avisos de metales', () => {
  const obs = [o('brillo', 'vitreo'), o('color', 'blanco'), o('fizz', 'fuerte'), o('dureza', [2.5, 3.5])];
  afirmar(E.seguridad(E.calcular(obs), obs).length === 0, JSON.stringify(E.seguridad(E.calcular(obs), obs)));
});

// ---------- Pruebas sugeridas ----------
prueba('entre magnetita y hematita la primera prueba útil es el imán o la raya', () => {
  const sug = E.sugerirPruebas([o('brillo', 'metalico'), o('color', 'negro'), o('transp', 'opaco')], Object.assign({}, KIT, { bascula: false }));
  const util = sug.filter(s => !s.visual && s.disponible);
  afirmar(['mag', 'raya'].includes(util[0].k), 'primera ' + util[0].k);
});
prueba('sin imán no se sugiere magnetismo', () => {
  const s = E.sugerirPruebas([o('color', 'negro')], Object.assign({}, KIT, { iman: false })).find(x => x.k === 'mag');
  afirmar(!s.disponible, 'disponible');
});
prueba('en NO ALTERAR se ocultan las pruebas que dejan marca', () => {
  const sug = E.sugerirPruebas([o('color', 'negro')], KIT, { noAlterar: true });
  for (const s of sug) if (['raya', 'dureza', 'fizz', 'mal'].includes(s.k)) afirmar(s.oculta, s.k + ' no oculta');
  afirmar(!sug.find(s => s.k === 'mag').oculta && !sug.find(s => s.k === 'densidad').oculta, 'ocultó pruebas no destructivas');
});
prueba('la vista previa de resultados nombra al candidato resultante', () => {
  const s = E.sugerirPruebas([o('brillo', 'metalico'), o('color', 'negro')], KIT).find(x => x.k === 'mag');
  const ninguna = s.salidas.find(x => x.v === 'ninguno'), fuerte = s.salidas.find(x => x.v === 'fuerte');
  afirmar(ninguna.top.id !== fuerte.top.id, 'ambos resultados llevarían al mismo candidato');
  cerca(s.salidas.reduce((t, x) => t + x.prob, 0), 1, 1e-6, 'suma de probabilidades de resultado');
});
prueba('una prueba ya hecha no se vuelve a sugerir', () => {
  afirmar(!E.sugerirPruebas([o('mag', 'ninguno')], KIT).some(s => s.k === 'mag'), 'repetida');
});

// ---------- Densidad ----------
prueba('densidad sumergida: 100 g en aire y 37,7 g sumergida ≈ 2,65', () => {
  const r = E.densidadSumergida(100, 37.7, 0.01);
  cerca(r.valor, 2.653, 0.01, 'valor'); afirmar(r.lo < r.valor && r.valor < r.hi, 'rango');
});
prueba('densidad sumergida: una báscula gruesa y una muestra pequeña ensanchan el rango', () => {
  const fina = E.densidadSumergida(20, 7.5, 0.01), gruesa = E.densidadSumergida(20, 7.5, 1);
  afirmar(gruesa.hi - gruesa.lo > 10 * (fina.hi - fina.lo), 'rango no crece');
});
prueba('densidad: entradas inválidas devuelven null', () => {
  afirmar(E.densidadSumergida(0, 5, 0.01) === null && E.densidadSumergida(10, -1, 0.01) === null && E.densidadDesplazamiento(10, 100, 100, 1) === null, 'no null');
});
prueba('densidad por desplazamiento: 52,4 g y +19 mL ≈ 2,76', () => {
  const r = E.densidadDesplazamiento(52.4, 100, 119, 1);
  cerca(r.valor, 2.758, 0.01, 'valor'); afirmar(r.lo < r.valor && r.hi > r.valor, 'rango');
});

// ---------- Calidad de fotografía ----------
prueba('una imagen nítida supera a la misma imagen desenfocada', () => {
  const w = 64, h = 64, nit = new Uint8Array(w * h), des = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) nit[y * w + x] = ((x >> 2) + (y >> 2)) % 2 ? 220 : 40;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += nit[(y + j) * w + x + i];
    des[y * w + x] = s / 9;
  }
  afirmar(E.nitidez(nit, w, h) > 3 * E.nitidez(des, w, h), 'nitidez');
  afirmar(E.juzgarFoto(E.nitidez(nit, w, h), E.exposicion(nit)).enfoque === 'bueno', 'juicio nítida');
  afirmar(E.juzgarFoto(0, E.exposicion(des)).enfoque === 'pobre', 'juicio plana');
});
prueba('detecta fotos oscuras y quemadas', () => {
  afirmar(E.juzgarFoto(500, E.exposicion(new Uint8Array(100).fill(10))).luz === 'oscura', 'oscura');
  afirmar(E.juzgarFoto(500, E.exposicion(new Uint8Array(100).fill(250))).luz === 'quemada', 'quemada');
  afirmar(E.juzgarFoto(500, E.exposicion(new Uint8Array(100).fill(120))).luz === 'ok', 'normal');
});

// ---------- IA: validación del vocabulario ----------
prueba('la respuesta de la IA solo conserva valores del vocabulario', () => {
  const r = E.validarIA({ brillo: ['vitreo', 'espectacular'], color: 'verde', transp: ['opaco', 'opaco'], habito: ['prismatico', 'inventado'], rasgo: ['costra', 'oro puro'], extra: ['x'] });
  const ids = r.map(x => x.k + ':' + x.v).sort();
  afirmar(JSON.stringify(ids) === JSON.stringify(['brillo:vitreo', 'color:verde', 'habito:prismatico', 'rasgo:costra', 'transp:opaco']), ids.join(','));
  afirmar(r.every(x => x.src === 'ia'), 'origen');
});
prueba('entradas basura no rompen la validación', () => {
  for (const x of [null, undefined, 5, 'texto', [], { color: 5 }, { color: [null, {}] }]) afirmar(Array.isArray(E.validarIA(x)), 'no devolvió lista');
});
prueba('el prompt de la IA enumera el vocabulario y prohíbe identificar', () => {
  const t = E.promptIA();
  afirmar(t.includes('adamantino') && t.includes('regmaglipto') && /No identifiques/.test(t), 'prompt incompleto');
});

// ---------- Registro de aciertos ----------
prueba('resumen de aciertos: primera opción, tres primeras y errores', () => {
  const ms = [
    { idFinal: { id: 'pirita' }, idIA: { top: 'pirita', top3: ['pirita', 'calcopirita', 'marcasita'] } },
    { idFinal: { id: 'calcopirita' }, idIA: { top: 'pirita', top3: ['pirita', 'calcopirita', 'marcasita'] } },
    { idFinal: { id: 'oro' }, idIA: { top: 'pirita', top3: ['pirita', 'calcopirita', 'marcasita'] } },
    { idFinal: null, idIA: null }
  ];
  const r = E.resumenAciertos(ms);
  afirmar(r.total === 3 && r.top1 === 1 && r.top3 === 2 && r.errores.length === 2, JSON.stringify([r.total, r.top1, r.top3, r.errores.length]));
});

console.log(ok + ' pruebas correctas, ' + fallos.length + ' con fallo');
if (fallos.length) { fallos.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
