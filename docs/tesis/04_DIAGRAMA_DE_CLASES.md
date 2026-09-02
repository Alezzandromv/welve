# Diagrama de Clases

Modelo de dominio completo. Las clases con el estereotipo `<<planeado>>` corresponden a
`docs/MODULO_ASESORIA_IA.md` y `docs/MODULO_FIDELIZACION_AVANZADA.md` — no tienen código en
`backend/app/models/` todavía. El resto refleja exactamente los modelos SQLAlchemy reales.

## Núcleo: identidad, personal y clientes

```mermaid
classDiagram
    class Usuario {
        +UUID id
        +string telefono
        +string nombre_completo
        +string correo
        +string hashed_password
        +bool correo_verificado
        +RolUsuario rol
        +bool esta_activo
        +string foto_perfil_url
        +bool acepta_whatsapp
        +datetime ultimo_acceso
        +datetime fecha_creacion
        +datetime actualizado_en
    }

    class Personal {
        +UUID id
        +UUID usuario_id
        +string especialidad
        +string biografia
        +string color_agenda
        +decimal comision_porcentaje
        +TipoContrato tipo_contrato
        +date fecha_ingreso
        +bool esta_activo
    }

    class DisponibilidadPersonal {
        +UUID id
        +UUID personal_id
        +int dia_semana
        +time hora_inicio
        +time hora_fin
        +int minutos_buffer
        +bool esta_activo
    }

    class Cliente {
        +UUID id
        +UUID usuario_id
        +date fecha_nacimiento
        +string canal_captacion
        +string[] etiquetas
        +string notas_internas
        +bool esta_bloqueada
        +string motivo_bloqueo
        +datetime fecha_bloqueo
    }
    note for Cliente "nivel_actual_id (FK a NivelFidelizacion) es un atributo planeado,\naún no existe en el modelo real — ver docs/MODULO_FIDELIZACION_AVANZADA.md"

    class FichaSalud {
        +UUID id
        +UUID cliente_id
        +string tipo_restriccion
        +string descripcion
        +SeveridadFicha severidad
        +bool esta_activo
    }

    class MagicLink {
        +UUID id
        +UUID usuario_id
        +UUID token
        +datetime expira_en
        +bool usado
        +datetime fecha_creacion
    }

    Usuario "1" --> "0..1" Personal : es
    Usuario "1" --> "0..1" Cliente : es
    Usuario "1" --> "*" MagicLink : solicita
    Personal "1" --> "*" DisponibilidadPersonal : define
    Cliente "1" --> "*" FichaSalud : tiene
```

## Catálogo de servicios, citas y pagos

```mermaid
classDiagram
    class Categoria {
        +UUID id
        +string nombre
        +string descripcion
        +string icono_url
        +string color_hex
        +int orden_visualizacion
        +bool esta_activo
    }

    class Servicio {
        +UUID id
        +UUID categoria_id
        +string nombre
        +string descripcion_tecnica
        +int duracion_minutos
        +decimal precio
        +decimal monto_deposito
        +bool requiere_ficha_salud
        +int horas_cancelacion_sin_penalidad
        +string imagen_referencia_url
        +bool esta_activo
    }

    class Cita {
        +UUID id
        +UUID cliente_id
        +UUID personal_id
        +datetime programada_en
        +datetime termina_en
        +EstadoCita estado
        +datetime hora_llegada_real
        +string notas_cliente
        +string notas_especialista
        +string motivo_cancelacion
        +datetime fecha_cancelacion
        +bool penalizacion_aplicada
        +datetime creada_en
    }

    class CitaServicio {
        +UUID id
        +UUID cita_id
        +UUID servicio_id
        +decimal precio_unitario
        +int duracion_minutos
    }

    class Pago {
        +UUID id
        +UUID cita_id
        +UUID cliente_id
        +TipoPago tipo
        +MetodoPago metodo
        +EstadoPago estado
        +decimal monto
        +string referencia_externa
        +string comprobante_url
        +UUID confirmado_por
        +datetime fecha_confirmacion
        +string nota_admin
    }

    Categoria "1" --> "*" Servicio : agrupa
    Cita "1" --> "*" CitaServicio : incluye
    Servicio "1" --> "*" CitaServicio : referenciado en
    Cita "1" --> "*" Pago : genera
```

## Fidelización (actual + planeada)

```mermaid
classDiagram
    class Descuento {
        +UUID id
        +string nombre
        +string descripcion
        +TipoDescuento tipo
        +ScopeDescuento scope
        +string codigo
        +decimal valor
        +decimal monto_minimo
        +int max_usos_global
        +int max_usos_por_cliente
        +datetime vigente_desde
        +datetime vigente_hasta
        +bool esta_activo
    }

    class Reto {
        +UUID id
        +string nombre
        +string descripcion_visible
        +int visitas_requeridas
        +int dias_ventana
        +RecompensaTipo recompensa_tipo
        +decimal recompensa_valor
        +bool esta_activo
        +datetime vigente_hasta
    }

    class DescuentoUso {
        +UUID id
        +UUID descuento_id
        +UUID cliente_id
        +UUID cita_id
        +UUID reto_origen_id
        +datetime fecha_canje
    }

    class NivelFidelizacion {
        <<planeado>>
        +UUID id
        +string nombre
        +int orden
        +TipoUmbral tipo_umbral
        +decimal valor_umbral
        +int dias_ventana
        +jsonb beneficios
        +bool esta_activo
    }

    class ProductoCatalogoExclusivo {
        <<planeado>>
        +UUID id
        +string nombre
        +string descripcion
        +decimal precio
        +string imagen_url
        +UUID nivel_minimo_id
        +int stock
        +bool esta_activo
    }

    class PedidoCatalogo {
        <<planeado>>
        +UUID id
        +UUID cliente_id
        +UUID producto_id
        +decimal monto
        +EstadoPedido estado
        +string referencia_pasarela
        +datetime fecha_creacion
        +datetime fecha_actualizacion
    }

    Descuento "1" --> "*" DescuentoUso : canjeado como
    Reto "1" --> "*" DescuentoUso : origina «premio»
    NivelFidelizacion "1" --> "*" ProductoCatalogoExclusivo : habilita
    ProductoCatalogoExclusivo "1" --> "*" PedidoCatalogo : comprado en
```

## Asesoría de belleza con IA (planeada)

```mermaid
classDiagram
    class EstiloCatalogo {
        <<planeado>>
        +UUID id
        +string nombre
        +string descripcion
        +string imagen_url
        +jsonb atributos
        +bool esta_activo
        +UUID creado_por
        +datetime fecha_creacion
    }

    class ConsultaIA {
        <<planeado>>
        +UUID id
        +UUID cliente_id
        +UUID personal_id
        +UUID cita_id
        +datetime creada_en
        +jsonb analisis_ia
        +jsonb estilos_sugeridos
    }

    class SeleccionEstilo {
        <<planeado>>
        +UUID id
        +UUID consulta_id
        +UUID estilo_catalogo_id
        +UUID cliente_id
        +UUID cita_id
        +OrigenSeleccion origen
        +ActorSeleccion seleccionado_por
        +bool enviado_a_trabajador
        +datetime fecha_seleccion
        +bool feedback_coincidio
        +string feedback_nota
    }

    ConsultaIA "1" --> "0..*" SeleccionEstilo : produce
    EstiloCatalogo "1" --> "*" SeleccionEstilo : elegido como
```

## Relaciones entre subdominios (resumen)

```mermaid
classDiagram
    direction LR
    Cliente "1" --> "*" Cita : reserva
    Personal "1" --> "*" Cita : atiende
    Cliente "1" --> "*" ConsultaIA : «planeado» inicia
    Personal "1" --> "*" ConsultaIA : «planeado» inicia
    Cliente "1" --> "*" PedidoCatalogo : «planeado» compra
    Cliente "1" --> "0..1" NivelFidelizacion : «planeado» tiene
    Cita "1" --> "0..1" SeleccionEstilo : «planeado» recibe
```
