#!/usr/bin/env python3
"""
Seed de demostración para Welve Beauty Salon.
Limpia todas las colecciones y las repuebla con datos realistas.

Uso:
    cd backend
    python seed.py
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

import bcrypt
import motor.motor_asyncio
from beanie import init_beanie
from bson import Binary
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.models import (
    Cita,
    CitaServicio,
    Categoria,
    Cliente,
    DescuentoUso,
    Descuento,
    DisponibilidadPersonal,
    FichaSalud,
    Pago,
    Personal,
    Reto,
    Servicio,
    Usuario,
)

LIMA = ZoneInfo("America/Lima")


def hoy() -> datetime:
    n = datetime.now(LIMA)
    return n.replace(hour=0, minute=0, second=0, microsecond=0)


def dt(base: datetime, dias: int = 0, hora: int = 9, minutos: int = 0) -> datetime:
    d = base + timedelta(days=dias)
    return d.replace(hour=hora, minute=minutos, second=0, microsecond=0)


def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


# ─── IDs fijos para referencias cruzadas ────────────────────────────────────

ID_ADMIN          = uuid4()

ID_U_SOFIA        = uuid4()
ID_U_VALERIA      = uuid4()
ID_U_CAMILA       = uuid4()

ID_P_SOFIA        = uuid4()
ID_P_VALERIA      = uuid4()
ID_P_CAMILA       = uuid4()

ID_U_ANDREA       = uuid4()
ID_U_VALENTINA    = uuid4()
ID_U_GABRIELA     = uuid4()
ID_U_ISABELLA     = uuid4()
ID_U_FERNANDA     = uuid4()
ID_U_DANIELA      = uuid4()
ID_U_CATALINA     = uuid4()
ID_U_LUCIA        = uuid4()

ID_CLI_ANDREA     = uuid4()
ID_CLI_VALENTINA  = uuid4()
ID_CLI_GABRIELA   = uuid4()
ID_CLI_ISABELLA   = uuid4()
ID_CLI_FERNANDA   = uuid4()
ID_CLI_DANIELA    = uuid4()
ID_CLI_CATALINA   = uuid4()
ID_CLI_LUCIA      = uuid4()

ID_CAT_COLOR      = uuid4()
ID_CAT_CORTE      = uuid4()
ID_CAT_TRAT       = uuid4()

ID_SVC_BALAYAGE   = uuid4()
ID_SVC_MECHAS     = uuid4()
ID_SVC_TINTE      = uuid4()
ID_SVC_CORTE      = uuid4()
ID_SVC_RECORTE    = uuid4()
ID_SVC_PEINADO    = uuid4()
ID_SVC_HIDRA      = uuid4()
ID_SVC_QUERATINA  = uuid4()
ID_SVC_MASCARILLA = uuid4()

ID_DESC_BIENVENIDA = uuid4()
ID_DESC_VERANO    = uuid4()
ID_RETO           = uuid4()


async def main() -> None:
    client = motor.motor_asyncio.AsyncIOMotorClient(os.environ["MONGODB_URL"])
    db_name = os.environ.get("DATABASE_NAME", "welve")
    db = client[db_name]

    await init_beanie(
        database=db,
        document_models=[
            Usuario, Personal, DisponibilidadPersonal,
            Cliente, FichaSalud, Categoria, Servicio,
            Cita, CitaServicio, Pago, Descuento, Reto, DescuentoUso,
        ],
    )

    colecciones = [
        "usuarios", "personal", "disponibilidad_personal",
        "clientes", "fichas_salud", "categorias", "servicios",
        "citas", "cita_servicios", "pagos",
        "descuentos", "retos", "descuento_usos", "magic_links",
    ]
    print(f"  Limpiando {len(colecciones)} colecciones en '{db_name}'...")
    for col in colecciones:
        await db[col].delete_many({})

    hoy_dt = hoy()
    print(f"  Fecha base: {hoy_dt.date()} (Lima)")

    # ─── USUARIOS ─────────────────────────────────────────────────────────────

    print("  Insertando usuarios...")
    usuarios = [
        Usuario(id=ID_ADMIN, nombre_completo="Luciana Torres", correo="admin@eunoia.pe",
                telefono="+51987000001", rol="admin", hashed_password=hash_pw("welve2026"),
                esta_activo=True, acepta_whatsapp=True,
                fecha_creacion=hoy_dt - timedelta(days=180)),

        Usuario(id=ID_U_SOFIA, nombre_completo="Sofía Mendoza", correo="sofia@eunoia.pe",
                telefono="+51987000002", rol="trabajador",
                fecha_creacion=hoy_dt - timedelta(days=120)),
        Usuario(id=ID_U_VALERIA, nombre_completo="Valeria Castro", correo="valeria@eunoia.pe",
                telefono="+51987000003", rol="trabajador",
                fecha_creacion=hoy_dt - timedelta(days=90)),
        Usuario(id=ID_U_CAMILA, nombre_completo="Camila Ríos", correo="camila@eunoia.pe",
                telefono="+51987000004", rol="trabajador",
                fecha_creacion=hoy_dt - timedelta(days=60)),

        Usuario(id=ID_U_ANDREA,    nombre_completo="Andrea Paredes",    telefono="+51987100001", rol="cliente"),
        Usuario(id=ID_U_VALENTINA, nombre_completo="Valentina Quispe",  telefono="+51987100002", rol="cliente"),
        Usuario(id=ID_U_GABRIELA,  nombre_completo="Gabriela Morales",  telefono="+51987100003", rol="cliente"),
        Usuario(id=ID_U_ISABELLA,  nombre_completo="Isabella Cruz",     telefono="+51987100004", rol="cliente"),
        Usuario(id=ID_U_FERNANDA,  nombre_completo="Fernanda Torres",   telefono="+51987100005", rol="cliente"),
        Usuario(id=ID_U_DANIELA,   nombre_completo="Daniela Ramos",     telefono="+51987100006", rol="cliente"),
        Usuario(id=ID_U_CATALINA,  nombre_completo="Catalina Huanca",   telefono="+51987100007", rol="cliente"),
        Usuario(id=ID_U_LUCIA,     nombre_completo="Lucía Vargas",      telefono="+51987100008", rol="cliente"),
    ]
    await Usuario.insert_many(usuarios)

    # ─── PERSONAL ─────────────────────────────────────────────────────────────

    print("  Insertando personal...")
    personal_list = [
        Personal(id=ID_P_SOFIA,   usuario_id=ID_U_SOFIA,   especialidad="Colorimetría & Mechas",
                 color_agenda="#a855f7", comision_porcentaje=30, tipo_contrato="planilla",
                 fecha_ingreso=(hoy_dt - timedelta(days=120)).date()),
        Personal(id=ID_P_VALERIA, usuario_id=ID_U_VALERIA, especialidad="Corte & Estilo",
                 color_agenda="#ec4899", comision_porcentaje=25, tipo_contrato="planilla",
                 fecha_ingreso=(hoy_dt - timedelta(days=90)).date()),
        Personal(id=ID_P_CAMILA,  usuario_id=ID_U_CAMILA,  especialidad="Tratamientos & Spa",
                 color_agenda="#0ea5e9", comision_porcentaje=28, tipo_contrato="honorarios",
                 fecha_ingreso=(hoy_dt - timedelta(days=60)).date()),
    ]
    await Personal.insert_many(personal_list)

    # ─── DISPONIBILIDAD (Lun–Sáb 09:00–18:00) ────────────────────────────────

    print("  Insertando disponibilidad...")
    disp_docs = []
    for pid in [ID_P_SOFIA, ID_P_VALERIA, ID_P_CAMILA]:
        for dia in range(1, 7):  # 1=Lun … 6=Sáb
            disp_docs.append({
                "_id": Binary.from_uuid(uuid4()),
                "personal_id": Binary.from_uuid(pid),
                "dia_semana": dia,
                "hora_inicio": "09:00",
                "hora_fin": "18:00",
                "minutos_buffer": 10,
                "esta_activo": True,
            })
    await db["disponibilidad_personal"].insert_many(disp_docs)

    # ─── CLIENTES ─────────────────────────────────────────────────────────────

    print("  Insertando clientes...")
    from datetime import date as d_
    clientes = [
        Cliente(id=ID_CLI_ANDREA,    usuario_id=ID_U_ANDREA,    etiquetas=["frecuente", "vip"],
                canal_captacion="instagram", fecha_nacimiento=d_(1995, 3, 12)),
        Cliente(id=ID_CLI_VALENTINA, usuario_id=ID_U_VALENTINA, etiquetas=["frecuente"],
                canal_captacion="referido"),
        Cliente(id=ID_CLI_GABRIELA,  usuario_id=ID_U_GABRIELA,  etiquetas=["nueva"],
                canal_captacion="instagram"),
        Cliente(id=ID_CLI_ISABELLA,  usuario_id=ID_U_ISABELLA,  etiquetas=["frecuente"],
                canal_captacion="google"),
        Cliente(id=ID_CLI_FERNANDA,  usuario_id=ID_U_FERNANDA,  etiquetas=["vip"],
                notas_internas="Prefiere turno de tarde"),
        Cliente(id=ID_CLI_DANIELA,   usuario_id=ID_U_DANIELA,   etiquetas=["nueva"],
                canal_captacion="tiktok"),
        Cliente(id=ID_CLI_CATALINA,  usuario_id=ID_U_CATALINA,  etiquetas=["frecuente"]),
        Cliente(id=ID_CLI_LUCIA,     usuario_id=ID_U_LUCIA,     etiquetas=["nueva"],
                canal_captacion="referido"),
    ]
    await Cliente.insert_many(clientes)

    # ─── FICHAS DE SALUD ──────────────────────────────────────────────────────

    print("  Insertando fichas de salud...")
    fichas = [
        FichaSalud(id=uuid4(), cliente_id=ID_CLI_ANDREA,
                   tipo_restriccion="Alergia tinte",
                   descripcion="Reacción alérgica a tintes con PPD. Usar siempre fórmulas sin PPD o sin amoniaco.",
                   severidad="moderada"),
        FichaSalud(id=uuid4(), cliente_id=ID_CLI_VALENTINA,
                   tipo_restriccion="Alergia queratina",
                   descripcion="Alergia severa al formaldehído presente en tratamientos de keratina. NO APLICAR bajo ninguna circunstancia.",
                   severidad="critica"),
        FichaSalud(id=uuid4(), cliente_id=ID_CLI_GABRIELA,
                   tipo_restriccion="Sensibilidad cuero cabelludo",
                   descripcion="Cuero cabelludo muy sensible. Usar productos sin sulfatos y temperatura baja en secado.",
                   severidad="informativa"),
    ]
    await FichaSalud.insert_many(fichas)

    # ─── CATEGORÍAS ───────────────────────────────────────────────────────────

    print("  Insertando categorías y servicios...")
    cats = [
        Categoria(id=ID_CAT_COLOR, nombre="Colorimetría",       orden_visualizacion=1, color_hex="#a855f7"),
        Categoria(id=ID_CAT_CORTE, nombre="Corte & Peinado",    orden_visualizacion=2, color_hex="#ec4899"),
        Categoria(id=ID_CAT_TRAT,  nombre="Tratamientos & Spa", orden_visualizacion=3, color_hex="#0ea5e9"),
    ]
    await Categoria.insert_many(cats)

    # ─── SERVICIOS ────────────────────────────────────────────────────────────

    servicios = [
        # Colorimetría
        Servicio(id=ID_SVC_BALAYAGE,  categoria_id=ID_CAT_COLOR, nombre="Balayage Full",
                 duracion_minutos=180, precio=280, monto_deposito=80, horas_cancelacion_sin_penalidad=5),
        Servicio(id=ID_SVC_MECHAS,    categoria_id=ID_CAT_COLOR, nombre="Mechas Californianas",
                 duracion_minutos=120, precio=200, monto_deposito=60, horas_cancelacion_sin_penalidad=5),
        Servicio(id=ID_SVC_TINTE,     categoria_id=ID_CAT_COLOR, nombre="Tinte Completo",
                 duracion_minutos=90,  precio=150, monto_deposito=50, horas_cancelacion_sin_penalidad=5),
        # Corte
        Servicio(id=ID_SVC_CORTE,     categoria_id=ID_CAT_CORTE, nombre="Corte & Peinado",
                 duracion_minutos=60,  precio=80,  monto_deposito=30, horas_cancelacion_sin_penalidad=3),
        Servicio(id=ID_SVC_RECORTE,   categoria_id=ID_CAT_CORTE, nombre="Recorte de Puntas",
                 duracion_minutos=30,  precio=40,  monto_deposito=15, horas_cancelacion_sin_penalidad=2),
        Servicio(id=ID_SVC_PEINADO,   categoria_id=ID_CAT_CORTE, nombre="Peinado para Evento",
                 duracion_minutos=90,  precio=120, monto_deposito=40, horas_cancelacion_sin_penalidad=4),
        # Tratamientos
        Servicio(id=ID_SVC_HIDRA,     categoria_id=ID_CAT_TRAT, nombre="Hidratación Profunda",
                 duracion_minutos=60,  precio=100, monto_deposito=35, horas_cancelacion_sin_penalidad=3),
        Servicio(id=ID_SVC_QUERATINA, categoria_id=ID_CAT_TRAT, nombre="Alisado Keratina",
                 duracion_minutos=120, precio=250, monto_deposito=70, requiere_ficha_salud=True,
                 horas_cancelacion_sin_penalidad=6),
        Servicio(id=ID_SVC_MASCARILLA,categoria_id=ID_CAT_TRAT, nombre="Mascarilla Nutrición",
                 duracion_minutos=45,  precio=70,  monto_deposito=25, horas_cancelacion_sin_penalidad=2),
    ]
    await Servicio.insert_many(servicios)

    # ─── CITAS ─────────────────────────────────────────────────────────────────

    print("  Insertando citas, cita_servicios y pagos...")

    citas_data: list[dict] = []

    # Mapas para acceso rápido
    svc_map: dict[UUID, Servicio] = {s.id: s for s in servicios}

    def cita_row(cli_id, per_id, svc_id, base, dias, hora, minutos, estado,
                  llegada_h=None, llegada_m=None, motivo=None):
        inicio = dt(base, dias, hora, minutos)
        svc = svc_map[svc_id]
        termina = inicio + timedelta(minutes=svc.duracion_minutos)
        llegada = dt(base, dias, llegada_h or hora, llegada_m or minutos) if llegada_h else None
        return dict(cli_id=cli_id, per_id=per_id, svc_id=svc_id,
                    inicio=inicio, termina=termina, estado=estado,
                    llegada=llegada, motivo=motivo,
                    penalizacion=estado in ("cancelada_tardia", "no_show"))

    # ── HOY ──────────────────────────────────────────────────────────────────
    citas_data += [
        cita_row(ID_CLI_ANDREA,    ID_P_SOFIA,   ID_SVC_BALAYAGE,   hoy_dt, 0,  9,  0, "en_curso", 9, 5),
        cita_row(ID_CLI_VALENTINA, ID_P_VALERIA, ID_SVC_CORTE,      hoy_dt, 0, 10, 30, "confirmada"),
        cita_row(ID_CLI_GABRIELA,  ID_P_CAMILA,  ID_SVC_HIDRA,      hoy_dt, 0, 11,  0, "confirmada"),
        cita_row(ID_CLI_ISABELLA,  ID_P_SOFIA,   ID_SVC_TINTE,      hoy_dt, 0, 12, 30, "pendiente"),
        cita_row(ID_CLI_FERNANDA,  ID_P_VALERIA, ID_SVC_PEINADO,    hoy_dt, 0, 14,  0, "completada", 14, 5),
        cita_row(ID_CLI_DANIELA,   ID_P_CAMILA,  ID_SVC_MASCARILLA, hoy_dt, 0, 15, 30, "completada", 15, 28),
        cita_row(ID_CLI_CATALINA,  ID_P_SOFIA,   ID_SVC_MECHAS,     hoy_dt, 0, 16,  0, "pendiente"),
        cita_row(ID_CLI_LUCIA,     ID_P_VALERIA, ID_SVC_RECORTE,    hoy_dt, 0, 17,  0, "pendiente"),
    ]

    # ── ESTA SEMANA (días pasados: -3, -2, -1) ───────────────────────────────
    citas_data += [
        # Lunes -2
        cita_row(ID_CLI_ANDREA,    ID_P_SOFIA,   ID_SVC_MECHAS,     hoy_dt, -2, 10, 0, "completada", 10, 3),
        cita_row(ID_CLI_FERNANDA,  ID_P_VALERIA, ID_SVC_CORTE,      hoy_dt, -2, 11, 0, "completada", 11, 0),
        cita_row(ID_CLI_LUCIA,     ID_P_CAMILA,  ID_SVC_MASCARILLA, hoy_dt, -2, 12, 0, "completada", 12, 10),
        cita_row(ID_CLI_CATALINA,  ID_P_SOFIA,   ID_SVC_TINTE,      hoy_dt, -2, 14, 0, "completada", 14, 8),
        # Martes -1
        cita_row(ID_CLI_ISABELA := ID_CLI_ISABELLA, ID_P_VALERIA, ID_SVC_PEINADO, hoy_dt, -1, 9, 30, "completada", 9, 35),
        cita_row(ID_CLI_GABRIELA,  ID_P_CAMILA,  ID_SVC_HIDRA,      hoy_dt, -1, 11, 0, "completada", 11, 0),
        cita_row(ID_CLI_DANIELA,   ID_P_SOFIA,   ID_SVC_BALAYAGE,   hoy_dt, -1, 13, 0, "cancelada",
                 motivo="Cliente solicitó cancelación con 6 horas de anticipación"),
    ]

    # ── PRÓXIMOS DÍAS (mañana +1, +2, +3) ────────────────────────────────────
    citas_data += [
        cita_row(ID_CLI_VALENTINA, ID_P_SOFIA,   ID_SVC_TINTE,      hoy_dt, 1,  9,  0, "confirmada"),
        cita_row(ID_CLI_ANDREA,    ID_P_CAMILA,  ID_SVC_QUERATINA,  hoy_dt, 1, 10,  0, "confirmada"),
        cita_row(ID_CLI_LUCIA,     ID_P_VALERIA, ID_SVC_CORTE,      hoy_dt, 1, 14,  0, "pendiente"),
        cita_row(ID_CLI_FERNANDA,  ID_P_SOFIA,   ID_SVC_MECHAS,     hoy_dt, 2, 10,  0, "pendiente"),
        cita_row(ID_CLI_ISABELA,   ID_P_VALERIA, ID_SVC_PEINADO,    hoy_dt, 2, 15, 30, "pendiente"),
        cita_row(ID_CLI_GABRIELA,  ID_P_CAMILA,  ID_SVC_MASCARILLA, hoy_dt, 3,  9, 30, "pendiente"),
        cita_row(ID_CLI_CATALINA,  ID_P_SOFIA,   ID_SVC_BALAYAGE,   hoy_dt, 3, 14,  0, "pendiente"),
        cita_row(ID_CLI_DANIELA,   ID_P_VALERIA, ID_SVC_RECORTE,    hoy_dt, 4, 11,  0, "pendiente"),
    ]

    # ── SEMANA PASADA ─────────────────────────────────────────────────────────
    for offset, cli, per, svc, h, m, estado in [
        (-7,  ID_CLI_ANDREA,    ID_P_SOFIA,   ID_SVC_BALAYAGE,   9,  0, "completada"),
        (-7,  ID_CLI_FERNANDA,  ID_P_VALERIA, ID_SVC_CORTE,     14,  0, "completada"),
        (-7,  ID_CLI_LUCIA,     ID_P_CAMILA,  ID_SVC_HIDRA,     11,  0, "completada"),
        (-8,  ID_CLI_CATALINA,  ID_P_SOFIA,   ID_SVC_TINTE,     10,  0, "completada"),
        (-8,  ID_CLI_VALENTINA, ID_P_VALERIA, ID_SVC_RECORTE,   12,  0, "completada"),
        (-8,  ID_CLI_GABRIELA,  ID_P_CAMILA,  ID_SVC_MASCARILLA,15,  0, "completada"),
        (-9,  ID_CLI_ISABELLA,  ID_P_SOFIA,   ID_SVC_MECHAS,    10, 30, "completada"),
        (-9,  ID_CLI_DANIELA,   ID_P_VALERIA, ID_SVC_PEINADO,   14,  0, "no_show"),
        (-10, ID_CLI_ANDREA,    ID_P_CAMILA,  ID_SVC_QUERATINA, 10,  0, "completada"),
        (-10, ID_CLI_FERNANDA,  ID_P_SOFIA,   ID_SVC_TINTE,     15,  0, "completada"),
    ]:
        citas_data.append(cita_row(cli, per, svc, hoy_dt, offset, h, m, estado,
                                   llegada_h=h if estado == "completada" else None,
                                   llegada_m=m + 5 if estado == "completada" else None))

    # ── MES PASADO (-20 a -35 días) ───────────────────────────────────────────
    for offset, cli, per, svc, h, m, estado in [
        (-20, ID_CLI_VALENTINA, ID_P_SOFIA,   ID_SVC_BALAYAGE,   9,  0, "completada"),
        (-20, ID_CLI_LUCIA,     ID_P_VALERIA, ID_SVC_CORTE,     14,  0, "completada"),
        (-21, ID_CLI_ANDREA,    ID_P_CAMILA,  ID_SVC_HIDRA,     11,  0, "completada"),
        (-21, ID_CLI_CATALINA,  ID_P_SOFIA,   ID_SVC_MECHAS,    10,  0, "completada"),
        (-22, ID_CLI_ISABELLA,  ID_P_VALERIA, ID_SVC_PEINADO,   15,  0, "cancelada_tardia"),
        (-24, ID_CLI_FERNANDA,  ID_P_SOFIA,   ID_SVC_TINTE,     10,  0, "completada"),
        (-24, ID_CLI_DANIELA,   ID_P_CAMILA,  ID_SVC_MASCARILLA,14,  0, "completada"),
        (-25, ID_CLI_GABRIELA,  ID_P_VALERIA, ID_SVC_RECORTE,    9,  0, "completada"),
        (-25, ID_CLI_LUCIA,     ID_P_SOFIA,   ID_SVC_BALAYAGE,  11,  0, "completada"),
        (-28, ID_CLI_VALENTINA, ID_P_CAMILA,  ID_SVC_HIDRA,     15,  0, "no_show"),
        (-28, ID_CLI_ANDREA,    ID_P_VALERIA, ID_SVC_CORTE,     10,  0, "completada"),
        (-30, ID_CLI_CATALINA,  ID_P_SOFIA,   ID_SVC_MECHAS,    14,  0, "completada"),
        (-32, ID_CLI_ISABELLA,  ID_P_CAMILA,  ID_SVC_QUERATINA, 10,  0, "completada"),
        (-35, ID_CLI_FERNANDA,  ID_P_VALERIA, ID_SVC_PEINADO,   16,  0, "completada"),
        (-35, ID_CLI_DANIELA,   ID_P_SOFIA,   ID_SVC_TINTE,     11,  0, "completada"),
    ]:
        citas_data.append(cita_row(cli, per, svc, hoy_dt, offset, h, m, estado,
                                   llegada_h=h if estado == "completada" else None,
                                   llegada_m=m + 8 if estado == "completada" else None,
                                   motivo="Cliente canceló tarde" if estado == "cancelada_tardia" else None))

    # ── DOS MESES ATRÁS (-45 a -60 días) ─────────────────────────────────────
    for offset, cli, per, svc, h, m in [
        (-45, ID_CLI_ANDREA,    ID_P_SOFIA,   ID_SVC_BALAYAGE,   9, 0),
        (-45, ID_CLI_VALENTINA, ID_P_VALERIA, ID_SVC_CORTE,     14, 0),
        (-46, ID_CLI_LUCIA,     ID_P_CAMILA,  ID_SVC_MASCARILLA, 11, 0),
        (-50, ID_CLI_GABRIELA,  ID_P_SOFIA,   ID_SVC_TINTE,     10, 0),
        (-52, ID_CLI_CATALINA,  ID_P_VALERIA, ID_SVC_RECORTE,   12, 0),
        (-55, ID_CLI_FERNANDA,  ID_P_CAMILA,  ID_SVC_HIDRA,     15, 0),
        (-57, ID_CLI_ANDREA,    ID_P_SOFIA,   ID_SVC_MECHAS,     9, 0),
        (-60, ID_CLI_ISABELLA,  ID_P_VALERIA, ID_SVC_PEINADO,   14, 0),
    ]:
        citas_data.append(cita_row(cli, per, svc, hoy_dt, offset, h, m, "completada", h, m + 10))

    # ─── Insertar citas, cita_servicios y pagos ───────────────────────────────

    METODOS = ["yape", "plin", "transferencia", "efectivo", "tarjeta"]

    citas_docs = []
    cs_docs    = []
    pagos_docs = []

    for i, row in enumerate(citas_data):
        cita_id = uuid4()
        svc = svc_map[row["svc_id"]]
        estado = row["estado"]

        cita = Cita(
            id=cita_id,
            cliente_id=row["cli_id"],
            personal_id=row["per_id"],
            programada_en=row["inicio"],
            termina_en=row["termina"],
            estado=estado,
            hora_llegada_real=row["llegada"],
            motivo_cancelacion=row["motivo"],
            penalizacion_aplicada=row["penalizacion"],
            creada_en=row["inicio"] - timedelta(days=3),
        )
        citas_docs.append(cita)

        cs_docs.append(CitaServicio(
            id=uuid4(), cita_id=cita_id,
            servicio_id=svc.id,
            precio_unitario=svc.precio,
            duracion_minutos=svc.duracion_minutos,
        ))

        metodo = METODOS[i % len(METODOS)]

        if estado == "completada":
            pagos_docs.append(Pago(
                id=uuid4(), cita_id=cita_id, cliente_id=row["cli_id"],
                tipo="total", metodo=metodo, estado="confirmado",
                monto=svc.precio,
                fecha_confirmacion=row["inicio"] + timedelta(hours=2),
            ))
        elif estado in ("pendiente", "confirmada", "en_curso"):
            pagos_docs.append(Pago(
                id=uuid4(), cita_id=cita_id, cliente_id=row["cli_id"],
                tipo="deposito", metodo=metodo,
                estado="confirmado" if estado in ("confirmada", "en_curso") else "pendiente",
                monto=svc.monto_deposito,
            ))
        elif estado in ("cancelada_tardia", "no_show"):
            pagos_docs.append(Pago(
                id=uuid4(), cita_id=cita_id, cliente_id=row["cli_id"],
                tipo="penalizacion", metodo="yape", estado="confirmado",
                monto=svc.monto_deposito,
                fecha_confirmacion=row["inicio"],
            ))

    await Cita.insert_many(citas_docs)
    await CitaServicio.insert_many(cs_docs)
    await Pago.insert_many(pagos_docs)

    # ─── DESCUENTOS ───────────────────────────────────────────────────────────

    print("  Insertando descuentos y retos...")
    descuentos = [
        Descuento(
            id=ID_DESC_BIENVENIDA, nombre="Bienvenida 20%", codigo="BIENVENIDA20",
            tipo="porcentaje", scope="publico", valor=20,
            max_usos_global=100, max_usos_por_cliente=1,
            vigente_desde=hoy_dt - timedelta(days=30),
            vigente_hasta=hoy_dt + timedelta(days=60),
        ),
        Descuento(
            id=ID_DESC_VERANO, nombre="Promo Invierno", codigo="INVIERNO10",
            tipo="monto_fijo", scope="publico", valor=10, monto_minimo=80,
            max_usos_global=50, max_usos_por_cliente=2,
            vigente_desde=hoy_dt - timedelta(days=7),
            vigente_hasta=hoy_dt + timedelta(days=30),
        ),
    ]
    await Descuento.insert_many(descuentos)

    # ─── RETOS ────────────────────────────────────────────────────────────────

    await Reto(
        id=ID_RETO, nombre="Clienta Leal",
        descripcion_visible="Visita 4 veces en 90 días y obtén 20% de descuento en tu próxima visita.",
        visitas_requeridas=4, dias_ventana=90,
        recompensa_tipo="descuento", recompensa_valor=20,
        vigente_hasta=hoy_dt + timedelta(days=365),
    ).insert()

    # ─── DESCUENTO USOS ───────────────────────────────────────────────────────

    # Tomar 2 citas completadas para registrar usos de descuento
    completadas = [c for c in citas_docs if c.estado == "completada"][:2]
    usos = [
        DescuentoUso(
            id=uuid4(), descuento_id=ID_DESC_BIENVENIDA,
            cliente_id=completadas[0].cliente_id,
            cita_id=completadas[0].id,
            fecha_canje=completadas[0].programada_en,
        ),
        DescuentoUso(
            id=uuid4(), descuento_id=ID_DESC_VERANO,
            cliente_id=completadas[1].cliente_id,
            cita_id=completadas[1].id,
            fecha_canje=completadas[1].programada_en,
        ),
    ]
    await DescuentoUso.insert_many(usos)

    # ─── Resumen ──────────────────────────────────────────────────────────────

    print()
    print("  ✅ Seed completado exitosamente")
    print()
    print(f"  Usuarios       : {len(usuarios)}")
    print(f"  Personal       : {len(personal_list)}")
    print(f"  Disponibilidad : {len(disp_docs)}")
    print(f"  Clientes       : {len(clientes)}")
    print(f"  Fichas salud   : {len(fichas)}")
    print(f"  Categorías     : {len(cats)}")
    print(f"  Servicios      : {len(servicios)}")
    print(f"  Citas          : {len(citas_docs)}  (hoy: 8, semana: 7, futuro: 8, pasado: {len(citas_docs)-23})")
    print(f"  Pagos          : {len(pagos_docs)}")
    print(f"  Descuentos     : {len(descuentos)}")
    print()
    print("  Admin login (desarrollo):")
    print("    correo    : admin@eunoia.pe")
    print("    contraseña: welve2026")
    print()


if __name__ == "__main__":
    asyncio.run(main())
