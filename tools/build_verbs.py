"""Build web/verbs.js: common verbs per CILS level with their conjugations.

Conjugations come from verbecc (pip install verbecc), which uses Wiktionary-based templates.
Verbs it would have to *predict* (no template) are rejected, so every table is a known pattern.

Run: python3 tools/build_verbs.py
"""
import json
import logging
import pathlib
import sys

logging.disable(logging.CRITICAL)
from verbecc import CompleteConjugator  # noqa: E402

# (infinitive, English, Spanish) per level, in the order learners usually meet them
VERBS = {
    "A1": [
        ("essere", "to be", "ser / estar"), ("avere", "to have", "tener / haber"), ("fare", "to do / make", "hacer"),
        ("andare", "to go", "ir"), ("venire", "to come", "venir"), ("stare", "to stay / be", "estar / quedarse"),
        ("potere", "can / to be able to", "poder"), ("dovere", "must / to have to", "deber / tener que"),
        ("volere", "to want", "querer"), ("sapere", "to know (facts) / can", "saber"), ("dire", "to say / tell", "decir"),
        ("parlare", "to speak", "hablar"), ("mangiare", "to eat", "comer"), ("bere", "to drink", "beber"),
        ("abitare", "to live (somewhere)", "vivir / residir"), ("lavorare", "to work", "trabajar"),
        ("studiare", "to study", "estudiar"), ("chiamarsi", "to be called", "llamarse"), ("prendere", "to take", "coger / tomar"),
        ("vedere", "to see", "ver"), ("leggere", "to read", "leer"), ("scrivere", "to write", "escribir"),
        ("dormire", "to sleep", "dormir"), ("aprire", "to open", "abrir"), ("capire", "to understand", "entender"),
        ("finire", "to finish", "terminar / acabar"), ("uscire", "to go out", "salir"), ("comprare", "to buy", "comprar"),
        ("arrivare", "to arrive", "llegar"), ("partire", "to leave / depart", "salir / partir"),
    ],
    "A2": [
        ("dare", "to give", "dar"), ("mettere", "to put", "poner"), ("conoscere", "to know (people, places)", "conocer"),
        ("sentire", "to hear / feel", "oír / sentir"), ("pensare", "to think", "pensar"), ("cercare", "to look for", "buscar"),
        ("trovare", "to find", "encontrar"), ("aspettare", "to wait (for)", "esperar"), ("pagare", "to pay", "pagar"),
        ("cominciare", "to begin", "empezar"), ("tornare", "to return", "volver"), ("ascoltare", "to listen (to)", "escuchar"),
        ("guardare", "to watch / look at", "mirar"), ("giocare", "to play (games, sport)", "jugar"),
        ("cucinare", "to cook", "cocinar"), ("svegliarsi", "to wake up", "despertarse"), ("alzarsi", "to get up", "levantarse"),
        ("vestirsi", "to get dressed", "vestirse"), ("lavarsi", "to wash (oneself)", "lavarse"),
        ("divertirsi", "to have fun", "divertirse"), ("piacere", "to be pleasing (to like)", "gustar"),
        ("rimanere", "to remain / stay", "quedarse / permanecer"), ("salire", "to go up / get on", "subir"),
        ("scendere", "to go down / get off", "bajar"), ("chiudere", "to close", "cerrar"), ("chiedere", "to ask", "preguntar / pedir"),
        ("rispondere", "to answer", "responder"), ("perdere", "to lose / miss", "perder"), ("vendere", "to sell", "vender"),
        ("viaggiare", "to travel", "viajar"),
    ],
    "B1": [
        ("credere", "to believe", "creer"), ("decidere", "to decide", "decidir"), ("scegliere", "to choose", "elegir"),
        ("spiegare", "to explain", "explicar"), ("ricordare", "to remember", "recordar"), ("dimenticare", "to forget", "olvidar"),
        ("succedere", "to happen", "suceder / pasar"), ("sembrare", "to seem", "parecer"), ("diventare", "to become", "llegar a ser / volverse"),
        ("nascere", "to be born", "nacer"), ("morire", "to die", "morir"), ("vivere", "to live", "vivir"),
        ("correre", "to run", "correr"), ("portare", "to bring / carry / wear", "llevar / traer"), ("provare", "to try (on) / feel", "probar / sentir"),
        ("riuscire", "to manage / succeed", "conseguir / lograr"), ("smettere", "to stop (doing)", "dejar de"),
        ("innamorarsi", "to fall in love", "enamorarse"), ("preoccuparsi", "to worry", "preocuparse"),
        ("sedersi", "to sit down", "sentarse"), ("offrire", "to offer", "ofrecer"), ("seguire", "to follow", "seguir"),
        ("tenere", "to hold / keep", "tener / sostener"), ("togliere", "to take off / remove", "quitar"),
        ("spendere", "to spend (money)", "gastar"), ("ridere", "to laugh", "reír"), ("piangere", "to cry", "llorar"),
        ("muovere", "to move", "mover"), ("permettere", "to allow", "permitir"), ("promettere", "to promise", "prometer"),
    ],
    "B2": [
        ("raggiungere", "to reach", "alcanzar"), ("convincere", "to convince", "convencer"), ("sostenere", "to support / maintain", "sostener"),
        ("ottenere", "to obtain", "obtener"), ("mantenere", "to keep / maintain", "mantener"), ("condurre", "to lead / conduct", "conducir / dirigir"),
        ("tradurre", "to translate", "traducir"), ("produrre", "to produce", "producir"), ("proporre", "to propose", "proponer"),
        ("supporre", "to suppose", "suponer"), ("esporre", "to expose / display", "exponer"), ("distinguere", "to distinguish", "distinguir"),
        ("difendere", "to defend", "defender"), ("sorprendere", "to surprise", "sorprender"), ("risolvere", "to solve", "resolver"),
        ("rendere", "to make / give back", "hacer / devolver"), ("valere", "to be worth", "valer"), ("riconoscere", "to recognise", "reconocer"),
        ("accadere", "to happen", "ocurrir"), ("crescere", "to grow", "crecer"), ("soddisfare", "to satisfy", "satisfacer"),
        ("riflettere", "to reflect", "reflexionar"), ("discutere", "to discuss / argue", "discutir"), ("coinvolgere", "to involve", "involucrar"),
        ("assumere", "to hire / take on", "contratar / asumir"),
    ],
    "C1": [
        ("attribuire", "to attribute", "atribuir"), ("intraprendere", "to undertake", "emprender"), ("presupporre", "to presuppose", "presuponer"),
        ("sottrarre", "to subtract / remove", "sustraer"), ("redigere", "to draw up / write", "redactar"), ("dissuadere", "to dissuade", "disuadir"),
        ("persuadere", "to persuade", "persuadir"), ("concedere", "to grant", "conceder"), ("prevalere", "to prevail", "prevalecer"),
        ("trascorrere", "to spend (time)", "pasar (el tiempo)"), ("sottintendere", "to imply", "sobreentender"), ("contraddire", "to contradict", "contradecir"),
        ("compiacere", "to please / gratify", "complacer"), ("emergere", "to emerge", "emerger"), ("sconfiggere", "to defeat", "derrotar"),
        ("esigere", "to demand", "exigir"), ("accingersi", "to be about to", "disponerse a"), ("desumere", "to infer", "deducir / inferir"),
        ("sopprimere", "to suppress / abolish", "suprimir"), ("ammettere", "to admit", "admitir"),
    ],
    "C2": [
        ("soggiacere", "to be subject to", "estar sujeto a"), ("aderire", "to adhere / join", "adherirse"),
        ("prefiggersi", "to set oneself (a goal)", "proponerse"), ("constare", "to consist of / be evident", "constar"), ("addurre", "to adduce / put forward", "aducir"),
        ("ingiungere", "to enjoin / order", "conminar / ordenar"), ("rifuggire", "to shun / shy away", "rehuir"), ("permanere", "to persist / remain", "permanecer"),
        ("assurgere", "to rise (to)", "alzarse / llegar a ser"), ("dissentire", "to disagree", "disentir"), ("protrarre", "to prolong", "prolongar"),
        ("sovrintendere", "to supervise", "supervisar"), ("redimere", "to redeem", "redimir"), ("estinguere", "to extinguish", "extinguir"),
    ],
}

# which tense each level introduces (from the CILS syllabus); learners keep practising earlier ones
TENSES = [
    # key, label, (mood, tense) in verbecc, level
    ("presente", "presente", ("indicativo", "presente"), "A1"),
    ("passato_prossimo", "passato prossimo", ("indicativo", "passato-prossimo"), "A1"),
    ("imperativo", "imperativo", ("imperativo", "affermativo"), "A1"),
    ("imperfetto", "imperfetto", ("indicativo", "imperfetto"), "A2"),
    ("condizionale", "condizionale presente", ("condizionale", "presente"), "B1"),
    ("futuro", "futuro semplice", ("indicativo", "futuro"), "B2"),
    ("trapassato_prossimo", "trapassato prossimo", ("indicativo", "trapassato-prossimo"), "B2"),
    ("congiuntivo_presente", "congiuntivo presente", ("congiuntivo", "presente"), "B2"),
    ("congiuntivo_imperfetto", "congiuntivo imperfetto", ("congiuntivo", "imperfetto"), "B2"),
    ("condizionale_passato", "condizionale passato", ("condizionale", "passato"), "B2"),
    ("passato_remoto", "passato remoto", ("indicativo", "passato-remoto"), "B2"),
    ("futuro_anteriore", "futuro anteriore", ("indicativo", "futuro-anteriore"), "B2"),
    ("congiuntivo_passato", "congiuntivo passato", ("congiuntivo", "passato"), "C1"),
    ("congiuntivo_trapassato", "congiuntivo trapassato", ("congiuntivo", "trapassato"), "C1"),
]
# verbs that take essere in compound tenses (verbecc's tables default to avere for some of these)
ESSERE = {
    "essere", "andare", "venire", "stare", "uscire", "arrivare", "partire", "tornare", "rimanere", "salire", "scendere",
    "piacere", "succedere", "sembrare", "diventare", "nascere", "morire", "riuscire", "accadere", "apparire", "crescere",
    "emergere", "constare", "permanere", "assurgere", "soggiacere", "valere", "prevalere",
}
# compound tense -> simple tense of the auxiliary
COMPOUND = {
    "passato_prossimo": "presente", "trapassato_prossimo": "imperfetto", "futuro_anteriore": "futuro",
    "condizionale_passato": "condizionale", "congiuntivo_passato": "congiuntivo_presente",
    "congiuntivo_trapassato": "congiuntivo_imperfetto",
}
# where verbecc's first (or only) form is wrong or old-fashioned; the first form is the one shown as the answer
OVERRIDES = {
    "vedere": {"pp": "visto/veduto"},
    "rimanere": {"pp": "rimasto"},
    "rispondere": {"pp": "risposto"},
    "vivere": {"pp": "vissuto"},
    "succedere": {"pp": "successo", "passato_remoto": ["successi", "succedesti", "successe", "succedemmo", "succedeste", "successero"]},
    "concedere": {"pp": "concesso", "passato_remoto": ["concessi", "concedesti", "concesse", "concedemmo", "concedeste", "concessero"]},
    "perdere": {"pp": "perso/perduto", "passato_remoto": ["persi/perdei/perdetti", "perdesti", "perse/perdé/perdette", "perdemmo", "perdeste", "persero/perderono/perdettero"]},
    "riflettere": {"pp": "riflettuto/riflesso", "passato_remoto": ["riflettei", "riflettesti", "rifletté", "riflettemmo", "rifletteste", "rifletterono"]},
    "risolvere": {"pp": "risolto", "passato_remoto": ["risolsi", "risolvesti", "risolse", "risolvemmo", "risolveste", "risolsero"]},
}
REFL = ["mi", "ti", "si", "ci", "vi", "si"]
PERSONS = [("io", "s", "1"), ("tu", "s", "2"), ("lui", "s", "3"), ("noi", "p", "1"), ("voi", "p", "2"), ("loro", "p", "3")]
SUBJECTS = ("che io ", "che tu ", "che lui ", "che noi ", "che voi ", "che loro ", "io ", "tu ", "lui ", "noi ", "voi ", "loro ")

conj = CompleteConjugator(lang="it")


def strip_subject(s):
    for p in SUBJECTS:
        if s.startswith(p):
            return s[len(p):]
    return s


def forms(table, imperative=False):
    out = []
    for pr, n, p in PERSONS:
        if imperative and pr in ("io", "lui", "loro"):
            out.append("")  # the drill only asks tu / noi / voi
            continue
        rows = [r for r in table if r["n"] == n and r["p"] == p and r.get("g", "m") == "m"]
        f = strip_subject(rows[0]["c"][0]) if rows else ""
        out.append("" if f == "-" else f)
    return out


def simple(moods, imperative_ok=True):
    t = {}
    for key, _, (mood, tense), _ in TENSES:
        if key not in COMPOUND:
            t[key] = forms(moods[mood][tense], imperative=(mood == "imperativo"))
    return t


def table(inf):
    data = json.loads(conj.conjugate(inf).to_json())
    if data["verb"].get("predicted"):
        raise ValueError("no template, would be guessed")
    return data["moods"]


def build():
    aux_tables = {a: simple(table(a)) for a in ("essere", "avere")}
    verbs, problems = [], []
    for level, items in VERBS.items():
        for inf, en, es in items:
            try:
                moods = table(inf)
            except Exception as e:  # verbecc has no reliable template for it
                problems.append(inf + " (" + str(e) or type(e).__name__ + ")")
                continue
            refl = inf.endswith("si")
            base = inf[:-2] + "e" if refl else inf
            pp = [r["c"][0] for r in moods["participio"]["participio-passato"] if r.get("g") == "m"]
            pp_s, pp_p = pp[0], pp[1]
            if any(len(a) > 2 and a[-2] not in "aeiouts" and a[-3:-1] in ("ds", "ns") for a in pp_s.split("/")):
                problems.append(inf + " (odd participle " + pp_s + ")")
                continue
            aux = "essere" if (refl or inf in ESSERE) else "avere"
            t = simple(moods)
            fix = OVERRIDES.get(inf, {})
            if "pp" in fix:
                pp_s = fix["pp"]
                pp_p = "/".join(a[:-1] + "i" for a in pp_s.split("/"))
            t.update({k: v for k, v in fix.items() if k != "pp"})
            for key, aux_tense in COMPOUND.items():
                row = []
                for i, a in enumerate(aux_tables[aux][aux_tense]):
                    part = (pp_p if i >= 3 else pp_s) if aux == "essere" else pp_s
                    pre = (REFL[i] + " " if refl else "") + a.split("/")[0] + " "
                    row.append("/".join(pre + alt for alt in part.split("/")))
                t[key] = row
            if refl:  # verbecc's reflexive imperatives are wrong: build alzati / alziamoci / alzatevi
                imp = forms(table(base)["imperativo"]["affermativo"], imperative=True)
                t["imperativo"] = ["", imp[1].split("/")[0] + "ti", "", imp[3].split("/")[0] + "ci", imp[4].split("/")[0] + "vi", ""]
            ger = [r["c"][0] for r in moods["infinito"]["gerundio"] if r.get("pr") == "lui"][0].replace(" lui", "")
            if refl:
                ger = "/".join(g + "si" for g in ger.split("/"))
            verbs.append({"it": inf, "en": en, "es": es, "level": level, "aux": aux, "pp": pp_s, "ger": ger, "t": t})
    return verbs, problems


if __name__ == "__main__":
    verbs, problems = build()
    if problems:
        print("Skipped:", ", ".join(problems), file=sys.stderr)
    tenses = [{"key": k, "label": label, "level": lv} for k, label, _, lv in TENSES]
    root = pathlib.Path(__file__).resolve().parent.parent
    body = json.dumps({"tenses": tenses, "persons": [p[0] for p in PERSONS], "verbs": verbs}, ensure_ascii=False, separators=(",", ":"))
    (root / "web" / "verbs.js").write_text(
        "// Generated by tools/build_verbs.py — edit the verb list there, not here.\n"
        "// Persons: io, tu, lui/lei, noi, voi, loro. Imperativo only has tu, noi, voi. Passato prossimo with essere is\n"
        "// written in the masculine (sono andato); the drill also accepts the feminine/plural endings.\n"
        "window.IIG_VERBS = " + body + ";\n", encoding="utf-8")
    print(len(verbs), "verbs written")
