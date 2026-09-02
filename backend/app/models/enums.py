"""Enums de dominio — equivalentes a los `Literal[...]` que usaban los Document de Beanie.

Se mapean a columnas `VARCHAR` con `CHECK` (ver `sa.Enum(..., native_enum=False)` en cada
modelo) en vez de tipos ENUM nativos de Postgres: un `CHECK` se autogenera y evoluciona con
Alembic como cualquier otro constraint, mientras que un `ALTER TYPE ... ADD VALUE` nativo es
más rígido y no lo detecta `--autogenerate`.
"""
import enum


class RolUsuario(str, enum.Enum):
    cliente = "cliente"
    trabajador = "trabajador"
    admin = "admin"


class TipoContrato(str, enum.Enum):
    planilla = "planilla"
    honorarios = "honorarios"


class SeveridadFicha(str, enum.Enum):
    informativa = "informativa"
    moderada = "moderada"
    critica = "critica"


class EstadoCita(str, enum.Enum):
    pendiente = "pendiente"
    confirmada = "confirmada"
    en_curso = "en_curso"
    completada = "completada"
    cancelada = "cancelada"
    cancelada_tardia = "cancelada_tardia"
    no_show = "no_show"


class TipoPago(str, enum.Enum):
    deposito = "deposito"
    saldo = "saldo"
    total = "total"
    penalizacion = "penalizacion"
    reembolso = "reembolso"


class MetodoPago(str, enum.Enum):
    efectivo = "efectivo"
    transferencia = "transferencia"
    yape = "yape"
    plin = "plin"
    tarjeta = "tarjeta"


class EstadoPago(str, enum.Enum):
    pendiente = "pendiente"
    confirmado = "confirmado"
    rechazado = "rechazado"
    reembolsado = "reembolsado"


class TipoDescuento(str, enum.Enum):
    porcentaje = "porcentaje"
    monto_fijo = "monto_fijo"


class ScopeDescuento(str, enum.Enum):
    publico = "publico"
    privado = "privado"
    reto = "reto"


class RecompensaTipo(str, enum.Enum):
    descuento = "descuento"
    servicio_gratis = "servicio_gratis"
    credito = "credito"
