"""
╔══════════════════════════════════════════════════════╗
║     STOURS DMC — CRM Gestion Agence de Voyages       ║
║           stours.ma  |  Développé avec Streamlit      ║
╚══════════════════════════════════════════════════════╝
Lancement : streamlit run app.py
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import date, datetime
import database as db

# ─── CONFIG ────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="STOURS CRM",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded",
)

db.init_db()

# ─── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }
    [data-testid="stSidebar"] * { color: white !important; }
    [data-testid="metric-container"] {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .section-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #0f3460;
        border-left: 4px solid #e94560;
        padding-left: 12px;
        margin-bottom: 20px;
    }
    .logo-header { text-align:center; padding:20px 0; border-bottom:1px solid rgba(255,255,255,0.2); margin-bottom:20px; }
    .logo-text   { font-size:1.8rem; font-weight:900; letter-spacing:3px; }
    .logo-sub    { font-size:0.75rem; opacity:0.7; letter-spacing:2px; }
</style>
""", unsafe_allow_html=True)

# ─── SIDEBAR ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div class="logo-header">
        <div class="logo-text">🌍 STOURS</div>
        <div class="logo-sub">DMC MAROC • CRM</div>
    </div>
    """, unsafe_allow_html=True)
    menu = st.radio("Navigation", [
        "📊 Tableau de bord",
        "👥 Clients",
        "✈️ Voyages & Circuits",
        "📋 Devis",
        "🏨 Réservations",
        "⚙️ Paramètres"
    ], label_visibility="collapsed")
    st.markdown("---")
    st.markdown("<small style='opacity:0.5'>© 2026 stours.ma</small>", unsafe_allow_html=True)


# ════════════════════════════════════════════════════════════════════════════════
# 1. TABLEAU DE BORD
# ════════════════════════════════════════════════════════════════════════════════
if menu == "📊 Tableau de bord":
    st.markdown('<div class="section-title">📊 Tableau de bord</div>', unsafe_allow_html=True)
    stats = db.get_stats()

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("👥 Clients",       stats["nb_clients"])
    col2.metric("✈️ Circuits",       stats["nb_voyages"])
    col3.metric("📋 Devis",          stats["nb_devis"])
    col4.metric("🏨 Réservations",   stats["nb_reservations"])
    col5.metric("💰 CA Total",       f"{stats['chiffre_affaires']:,.0f} €")

    st.markdown("---")
    col_a, col_b, col_c = st.columns(3)

    with col_a:
        st.subheader("Statuts des Devis")
        if stats["devis_statuts"]:
            fig = px.pie(
                names=list(stats["devis_statuts"].keys()),
                values=list(stats["devis_statuts"].values()),
                color_discrete_sequence=["#0f3460", "#e94560", "#16213e", "#f5a623"],
                hole=0.4
            )
            fig.update_layout(height=280, margin=dict(t=10, b=10))
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Aucun devis")

    with col_b:
        st.subheader("CA par Circuit")
        if stats["res_par_voyage"]:
            df_v = pd.DataFrame(stats["res_par_voyage"])
            fig = px.bar(df_v, x="ca", y="nom", orientation="h",
                         color="ca", color_continuous_scale=["#16213e", "#e94560"],
                         labels={"ca": "CA (€)", "nom": ""})
            fig.update_layout(height=280, margin=dict(t=10, b=10), coloraxis_showscale=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Aucune réservation")

    with col_c:
        st.subheader("Clients par Nationalité")
        if stats["clients_nationalite"]:
            df_n = pd.DataFrame(stats["clients_nationalite"])
            fig = px.bar(df_n, x="n", y="nationalite", orientation="h",
                         color="n", color_continuous_scale=["#16213e", "#e94560"],
                         labels={"n": "Nombre", "nationalite": ""})
            fig.update_layout(height=280, margin=dict(t=10, b=10), coloraxis_showscale=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Aucun client")

    st.markdown("---")
    st.subheader("💳 Suivi des Encaissements")
    c1, c2, c3 = st.columns(3)
    c1.metric("Total Facturé",  f"{stats['chiffre_affaires']:,.0f} €")
    c2.metric("Acomptes Reçus", f"{stats['acomptes_recus']:,.0f} €")
    c3.metric("Solde Restant",  f"{stats['solde_restant']:,.0f} €")
    if stats['chiffre_affaires'] > 0:
        pct = stats['acomptes_recus'] / stats['chiffre_affaires']
        st.progress(pct, text=f"Encaissement global : {pct*100:.1f}%")


# ════════════════════════════════════════════════════════════════════════════════
# 2. CLIENTS
# ════════════════════════════════════════════════════════════════════════════════
elif menu == "👥 Clients":
    st.markdown('<div class="section-title">👥 Gestion des Clients</div>', unsafe_allow_html=True)
    tab1, tab2 = st.tabs(["📋 Liste", "➕ Nouveau client"])

    with tab1:
        clients = db.get_all_clients()
        if clients:
            df = pd.DataFrame(clients)
            search = st.text_input("🔍 Rechercher (nom, email, nationalité)...")
            if search:
                mask = df.apply(lambda r: search.lower() in " ".join(str(v) for v in r.values).lower(), axis=1)
                df = df[mask]
            st.dataframe(
                df[["id","nom","prenom","email","telephone","nationalite","adresse","notes"]].rename(columns={
                    "id":"ID","nom":"Nom","prenom":"Prénom","email":"Email",
                    "telephone":"Téléphone","nationalite":"Nationalité",
                    "adresse":"Adresse","notes":"Notes"
                }),
                use_container_width=True, hide_index=True, height=400
            )
            st.caption(f"{len(df)} client(s)")

            with st.expander("✏️ Modifier / Supprimer un client"):
                client_map = {f"{c['nom']} {c['prenom']} (ID:{c['id']})": c['id'] for c in clients}
                sel = st.selectbox("Client", list(client_map.keys()))
                cid = client_map[sel]
                cdata = db.get_client(cid)
                if cdata:
                    with st.form("edit_client"):
                        c1, c2 = st.columns(2)
                        nom   = c1.text_input("Nom",    value=cdata["nom"])
                        prenom= c2.text_input("Prénom", value=cdata["prenom"])
                        email = c1.text_input("Email",  value=cdata["email"] or "")
                        tel   = c2.text_input("Téléphone", value=cdata["telephone"] or "")
                        nat   = c1.text_input("Nationalité", value=cdata["nationalite"] or "")
                        passp = c2.text_input("Passeport", value=cdata["passeport"] or "")
                        adr   = st.text_input("Adresse", value=cdata["adresse"] or "")
                        notes = st.text_area("Notes", value=cdata["notes"] or "")
                        cs, cd = st.columns(2)
                        save   = cs.form_submit_button("💾 Enregistrer", use_container_width=True, type="primary")
                        delete = cd.form_submit_button("🗑️ Supprimer", use_container_width=True)
                    if save:
                        db.update_client(cid, nom, prenom, email, tel, nat, passp, adr, notes)
                        st.success("Client mis à jour !")
                        st.rerun()
                    if delete:
                        db.delete_client(cid)
                        st.warning("Client supprimé.")
                        st.rerun()
        else:
            st.info("Aucun client. Ajoutez le premier !")

    with tab2:
        with st.form("new_client", clear_on_submit=True):
            c1, c2 = st.columns(2)
            nom   = c1.text_input("Nom *")
            prenom= c2.text_input("Prénom *")
            email = c1.text_input("Email")
            tel   = c2.text_input("Téléphone")
            nat   = c1.text_input("Nationalité")
            passp = c2.text_input("N° Passeport")
            adr   = st.text_input("Adresse")
            notes = st.text_area("Notes internes")
            sub   = st.form_submit_button("➕ Créer le client", use_container_width=True, type="primary")
        if sub:
            if nom and prenom:
                try:
                    db.add_client(nom, prenom, email, tel, nat, passp, adr, notes)
                    st.success(f"✅ Client {prenom} {nom} ajouté !")
                    st.rerun()
                except Exception as e:
                    st.error(f"Erreur : {e}")
            else:
                st.warning("Nom et prénom obligatoires.")


# ════════════════════════════════════════════════════════════════════════════════
# 3. VOYAGES
# ════════════════════════════════════════════════════════════════════════════════
elif menu == "✈️ Voyages & Circuits":
    st.markdown('<div class="section-title">✈️ Voyages & Circuits</div>', unsafe_allow_html=True)
    tab1, tab2 = st.tabs(["📋 Catalogue", "➕ Nouveau Circuit"])

    with tab1:
        voyages = db.get_all_voyages()
        if voyages:
            categories = list(set(v["categorie"] for v in voyages if v["categorie"]))
            cat_filter = st.multiselect("Catégorie", categories, default=categories)
            vf = [v for v in voyages if v["categorie"] in cat_filter] if cat_filter else voyages
            icons = {"Culture":"🏛️","Aventure":"🏕️","Plage":"🏖️","Nature":"🌿","Luxe":"💎","Sport":"⛷️","Business":"💼"}
            cols = st.columns(3)
            for i, v in enumerate(vf):
                icon = icons.get(v["categorie"], "✈️")
                with cols[i % 3]:
                    with st.container(border=True):
                        st.markdown(f"**{icon} {v['nom']}**")
                        st.caption(f"📍 {v['destination']} • {v['duree_jours']} jours")
                        st.caption(f"🏷️ {v['categorie']}")
                        if v["description"]:
                            st.caption(v["description"])
                        st.markdown(f"### {v['prix_base']:,.0f} € / pers.")
        else:
            st.info("Aucun circuit.")

    with tab2:
        with st.form("new_voyage", clear_on_submit=True):
            c1, c2 = st.columns(2)
            nom   = c1.text_input("Nom du circuit *")
            dest  = c2.text_input("Destination(s) *")
            duree = c1.number_input("Durée (jours)", 1, 30, 7)
            prix  = c2.number_input("Prix base (€/pers.)", 0.0, step=50.0, value=1000.0)
            cat   = c1.selectbox("Catégorie", ["Culture","Aventure","Plage","Nature","Luxe","Sport","Business","Autre"])
            desc  = st.text_area("Description")
            sub   = st.form_submit_button("➕ Ajouter le circuit", use_container_width=True, type="primary")
        if sub:
            if nom and dest:
                db.add_voyage(nom, dest, duree, desc, prix, cat)
                st.success(f"✅ Circuit '{nom}' créé !")
                st.rerun()
            else:
                st.warning("Nom et destination obligatoires.")


# ════════════════════════════════════════════════════════════════════════════════
# 4. DEVIS
# ════════════════════════════════════════════════════════════════════════════════
elif menu == "📋 Devis":
    st.markdown('<div class="section-title">📋 Gestion des Devis</div>', unsafe_allow_html=True)
    tab1, tab2 = st.tabs(["📋 Liste", "➕ Créer un devis"])
    STATUTS = ["En attente", "Envoyé", "Confirmé", "Annulé"]
    ICONS   = {"En attente":"🟡","Envoyé":"🔵","Confirmé":"🟢","Annulé":"🔴"}

    with tab1:
        devis = db.get_all_devis()
        if devis:
            filtre = st.selectbox("Filtrer", ["Tous"] + STATUTS)
            if filtre != "Tous":
                devis = [d for d in devis if d["statut"] == filtre]
            df = pd.DataFrame(devis)
            df["Statut"] = df["statut"].apply(lambda s: f"{ICONS.get(s,'')} {s}")
            st.dataframe(
                df.rename(columns={
                    "reference":"Référence","client_nom":"Client","voyage_nom":"Circuit",
                    "nb_personnes":"Pers.","date_depart":"Départ","date_retour":"Retour",
                    "prix_total":"Total €"
                })[["Référence","Client","Circuit","Pers.","Départ","Retour","Total €","Statut"]],
                use_container_width=True, hide_index=True
            )
            with st.expander("🔄 Changer le statut"):
                all_d = db.get_all_devis()
                ref_map = {f"{d['reference']} — {d['client_nom']}": d["id"] for d in all_d}
                sel = st.selectbox("Devis", list(ref_map.keys()))
                ns  = st.selectbox("Nouveau statut", STATUTS)
                if st.button("Mettre à jour", type="primary"):
                    db.update_devis_statut(ref_map[sel], ns)
                    st.success("Statut mis à jour !")
                    st.rerun()
        else:
            st.info("Aucun devis.")

    with tab2:
        clients = db.get_all_clients()
        voyages = db.get_all_voyages()
        if not clients:
            st.warning("Créez d'abord des clients.")
        elif not voyages:
            st.warning("Créez d'abord des circuits.")
        else:
            cmap = {f"{c['prenom']} {c['nom']}": c["id"] for c in clients}
            vmap = {f"{v['nom']} — {v['prix_base']:,.0f}€": v for v in voyages}
            with st.form("new_devis", clear_on_submit=True):
                c1, c2 = st.columns(2)
                ref  = c1.text_input("Référence", value=f"DEV-{datetime.now().strftime('%Y%m%d-%H%M')}")
                stat = c2.selectbox("Statut", STATUTS)
                scl  = c1.selectbox("Client *", list(cmap.keys()))
                svg  = c2.selectbox("Circuit *", list(vmap.keys()))
                nbp  = c1.number_input("Personnes", 1, 50, 2)
                prix_auto = vmap[svg]["prix_base"] * nbp
                prix = c2.number_input("Prix total (€)", value=float(prix_auto), step=50.0)
                dep  = c1.date_input("Départ", value=date.today())
                ret  = c2.date_input("Retour")
                note = st.text_area("Notes")
                st.info(f"💡 Prix calculé : {prix_auto:,.0f} € ({nbp} × {vmap[svg]['prix_base']:,.0f} €)")
                sub  = st.form_submit_button("📋 Créer le devis", use_container_width=True, type="primary")
            if sub:
                try:
                    db.add_devis(ref, cmap[scl], vmap[svg]["id"], nbp, str(dep), str(ret), prix, stat, note)
                    st.success(f"✅ Devis {ref} créé !")
                    st.rerun()
                except Exception as e:
                    st.error(f"Erreur : {e}")


# ════════════════════════════════════════════════════════════════════════════════
# 5. RÉSERVATIONS
# ════════════════════════════════════════════════════════════════════════════════
elif menu == "🏨 Réservations":
    st.markdown('<div class="section-title">🏨 Gestion des Réservations</div>', unsafe_allow_html=True)
    tab1, tab2 = st.tabs(["📋 Liste", "➕ Nouvelle réservation"])
    STATUTS_R = ["Confirmée", "En cours", "Terminée", "Annulée"]

    with tab1:
        res = db.get_all_reservations()
        if res:
            df = pd.DataFrame(res)
            st.dataframe(
                df.rename(columns={
                    "reference":"Référence","client_nom":"Client","voyage_nom":"Circuit",
                    "nb_personnes":"Pers.","date_depart":"Départ","date_retour":"Retour",
                    "prix_total":"Total €","acompte":"Acompte €","solde":"Solde €","statut":"Statut"
                })[["Référence","Client","Circuit","Pers.","Départ","Retour","Total €","Acompte €","Solde €","Statut"]],
                use_container_width=True, hide_index=True
            )
            c1, c2, c3 = st.columns(3)
            c1.metric("Total CA",       f"{df['prix_total'].sum():,.0f} €")
            c2.metric("Acomptes reçus", f"{df['acompte'].sum():,.0f} €")
            c3.metric("Solde restant",  f"{df['solde'].sum():,.0f} €")
        else:
            st.info("Aucune réservation.")

    with tab2:
        clients = db.get_all_clients()
        voyages = db.get_all_voyages()
        all_d   = db.get_all_devis()
        if not clients or not voyages:
            st.warning("Créez d'abord des clients et des circuits.")
        else:
            cmap = {f"{c['prenom']} {c['nom']}": c["id"] for c in clients}
            vmap = {f"{v['nom']} — {v['prix_base']:,.0f}€": v for v in voyages}
            dmap = {"— Sans devis lié —": None}
            dmap.update({f"{d['reference']} — {d['client_nom']}": d["id"] for d in all_d})
            with st.form("new_resa", clear_on_submit=True):
                c1, c2 = st.columns(2)
                ref  = c1.text_input("Référence", value=f"RES-{datetime.now().strftime('%Y%m%d-%H%M')}")
                stat = c2.selectbox("Statut", STATUTS_R)
                scl  = c1.selectbox("Client *", list(cmap.keys()))
                svg  = c2.selectbox("Circuit *", list(vmap.keys()))
                sdv  = c1.selectbox("Devis lié", list(dmap.keys()))
                nbp  = c2.number_input("Personnes", 1, 50, 2)
                dep  = c1.date_input("Départ")
                ret  = c2.date_input("Retour")
                prix_auto = vmap[svg]["prix_base"] * nbp
                prix = c1.number_input("Prix total (€)", value=float(prix_auto), step=50.0)
                acp  = c2.number_input("Acompte versé (€)", value=float(prix_auto * 0.3), step=50.0)
                st.info(f"Solde restant : **{prix - acp:,.0f} €**")
                note = st.text_area("Notes")
                sub  = st.form_submit_button("🏨 Confirmer la réservation", use_container_width=True, type="primary")
            if sub:
                try:
                    db.add_reservation(ref, dmap[sdv], cmap[scl], vmap[svg]["id"],
                                       nbp, str(dep), str(ret), prix, acp, stat, note)
                    st.success(f"✅ Réservation {ref} confirmée !")
                    st.rerun()
                except Exception as e:
                    st.error(f"Erreur : {e}")


# ════════════════════════════════════════════════════════════════════════════════
# 6. PARAMÈTRES
# ════════════════════════════════════════════════════════════════════════════════
elif menu == "⚙️ Paramètres":
    st.markdown('<div class="section-title">⚙️ Paramètres & Export</div>', unsafe_allow_html=True)
    st.info("🏢 **STOURS DMC** — Destination Management Company | stours.ma")

    c1, c2 = st.columns(2)
    with c1:
        with st.container(border=True):
            st.markdown("#### 📥 Export des données")
            if st.button("Exporter Clients CSV", use_container_width=True):
                df = pd.DataFrame(db.get_all_clients())
                st.download_button("⬇️ Télécharger", df.to_csv(index=False).encode(), "stours_clients.csv", "text/csv")
            if st.button("Exporter Devis CSV", use_container_width=True):
                df = pd.DataFrame(db.get_all_devis())
                st.download_button("⬇️ Télécharger", df.to_csv(index=False).encode(), "stours_devis.csv", "text/csv")
            if st.button("Exporter Réservations CSV", use_container_width=True):
                df = pd.DataFrame(db.get_all_reservations())
                st.download_button("⬇️ Télécharger", df.to_csv(index=False).encode(), "stours_reservations.csv", "text/csv")

    with c2:
        with st.container(border=True):
            st.markdown("#### ℹ️ Système")
            s = db.get_stats()
            st.write(f"Clients : **{s['nb_clients']}**")
            st.write(f"Circuits : **{s['nb_voyages']}**")
            st.write(f"Devis : **{s['nb_devis']}**")
            st.write(f"Réservations : **{s['nb_reservations']}**")
            st.write(f"CA Total : **{s['chiffre_affaires']:,.2f} €**")
            st.markdown("---")
            st.write("🗄️ Base : SQLite (`stours_crm.db`)")
            st.write("🐍 Framework : Streamlit + Plotly")
            st.write("📦 Version : 1.0.0")
