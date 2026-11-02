
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "alumnos_carreras": {
                  Row: {
                    "carrera_id": number,"created_at": string,"persona_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "carrera_id": number,"created_at"?: string,"persona_id": string
                  }
                  Update: {
                    "carrera_id"?: number,"created_at"?: string,"persona_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_carreras_carrera_id_fkey"
      columns: ["carrera_id"]
isOneToOne: false
      referencedRelation: "alumnos_carreras_maestro"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_carreras_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: true
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_carreras_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: true
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_carreras_maestro": {
                  Row: {
                    "activo": boolean,"created_at": string,"id": number,"nombre": string,"orden": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"id"?: never,"nombre": string,"orden"?: number
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"id"?: never,"nombre"?: string,"orden"?: number
                  }
                  Relationships: [
                    
                  ]
                },"alumnos_entregas": {
                  Row: {
                    "archivo_path": string,"created_at": string,"evento_id": string,"id": string,"nombre_archivo": string,"nota": string | null,"persona_id": string | null,"proyecto_id": string | null,"subida_por": string | null,"tamano_bytes": number,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archivo_path": string,"created_at"?: string,"evento_id": string,"id"?: string,"nombre_archivo": string,"nota"?: string | null,"persona_id"?: string | null,"proyecto_id"?: string | null,"subida_por"?: string | null,"tamano_bytes": number,"version": number
                  }
                  Update: {
                    "archivo_path"?: string,"created_at"?: string,"evento_id"?: string,"id"?: string,"nombre_archivo"?: string,"nota"?: string | null,"persona_id"?: string | null,"proyecto_id"?: string | null,"subida_por"?: string | null,"tamano_bytes"?: number,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_entregas_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_entregas_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_entregas_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_entregas_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_entregas_subida_por_fkey"
      columns: ["subida_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_entregas_subida_por_fkey"
      columns: ["subida_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_entregas_devoluciones": {
                  Row: {
                    "autor_id": string | null,"created_at": string,"entrega_id": string,"id": string,"respuesta_a": string | null,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"created_at"?: string,"entrega_id": string,"id"?: string,"respuesta_a"?: string | null,"texto": string
                  }
                  Update: {
                    "autor_id"?: string | null,"created_at"?: string,"entrega_id"?: string,"id"?: string,"respuesta_a"?: string | null,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_entregas_devoluciones_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_entregas_devoluciones_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_entregas_devoluciones_entrega_id_fkey"
      columns: ["entrega_id"]
isOneToOne: false
      referencedRelation: "alumnos_entregas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_entregas_devoluciones_respuesta_a_fkey"
      columns: ["respuesta_a"]
isOneToOne: false
      referencedRelation: "alumnos_entregas_devoluciones"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_grupo_intereses": {
                  Row: {
                    "estrellas": number,"interes_id": number,"proyecto_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "estrellas": number,"interes_id": number,"proyecto_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "estrellas"?: number,"interes_id"?: number,"proyecto_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_grupo_intereses_interes_id_fkey"
      columns: ["interes_id"]
isOneToOne: false
      referencedRelation: "alumnos_intereses_maestro"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_grupo_intereses_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_grupo_intereses_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_grupo_intereses_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_grupo_intereses_calculo": {
                  Row: {
                    "calculado_at": string,"calculado_por": string | null,"integrantes": (string)[],"proyecto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calculado_at"?: string,"calculado_por"?: string | null,"integrantes": (string)[],"proyecto_id": string
                  }
                  Update: {
                    "calculado_at"?: string,"calculado_por"?: string | null,"integrantes"?: (string)[],"proyecto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_grupo_intereses_calculo_calculado_por_fkey"
      columns: ["calculado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_grupo_intereses_calculo_calculado_por_fkey"
      columns: ["calculado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_grupo_intereses_calculo_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: true
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_grupo_intereses_historial": {
                  Row: {
                    "created_at": string,"estrellas_antes": number | null,"estrellas_despues": number | null,"id": number,"interes_id": number,"persona_id": string | null,"proyecto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"estrellas_antes"?: number | null,"estrellas_despues"?: number | null,"id"?: never,"interes_id": number,"persona_id"?: string | null,"proyecto_id": string
                  }
                  Update: {
                    "created_at"?: string,"estrellas_antes"?: number | null,"estrellas_despues"?: number | null,"id"?: never,"interes_id"?: number,"persona_id"?: string | null,"proyecto_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"alumnos_ideas": {
                  Row: {
                    "a_quien_le_pasa": string | null,"autor_id": string | null,"como_seria_resuelto": string | null,"created_at": string,"descripcion": string,"estado": string,"id": string,"interes_id": number | null,"que_se_intento": string | null,"titulo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "a_quien_le_pasa"?: string | null,"autor_id"?: string | null,"como_seria_resuelto"?: string | null,"created_at"?: string,"descripcion": string,"estado"?: string,"id"?: string,"interes_id"?: number | null,"que_se_intento"?: string | null,"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "a_quien_le_pasa"?: string | null,"autor_id"?: string | null,"como_seria_resuelto"?: string | null,"created_at"?: string,"descripcion"?: string,"estado"?: string,"id"?: string,"interes_id"?: number | null,"que_se_intento"?: string | null,"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_ideas_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_interes_id_fkey"
      columns: ["interes_id"]
isOneToOne: false
      referencedRelation: "alumnos_intereses_maestro"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_ideas_interesados": {
                  Row: {
                    "created_at": string,"idea_id": string,"persona_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"idea_id": string,"persona_id": string
                  }
                  Update: {
                    "created_at"?: string,"idea_id"?: string,"persona_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_ideas_interesados_idea_id_fkey"
      columns: ["idea_id"]
isOneToOne: false
      referencedRelation: "alumnos_ideas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_interesados_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_interesados_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_ideas_mensajes": {
                  Row: {
                    "autor_id": string | null,"created_at": string,"id": string,"idea_id": string,"respuesta_a": string | null,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"created_at"?: string,"id"?: string,"idea_id": string,"respuesta_a"?: string | null,"texto": string
                  }
                  Update: {
                    "autor_id"?: string | null,"created_at"?: string,"id"?: string,"idea_id"?: string,"respuesta_a"?: string | null,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_ideas_mensajes_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_mensajes_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_mensajes_idea_id_fkey"
      columns: ["idea_id"]
isOneToOne: false
      referencedRelation: "alumnos_ideas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_mensajes_respuesta_a_fkey"
      columns: ["respuesta_a"]
isOneToOne: false
      referencedRelation: "alumnos_ideas_mensajes"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_ideas_reportes": {
                  Row: {
                    "created_at": string,"id": string,"idea_id": string,"mensaje_id": string | null,"motivo": string,"persona_id": string,"resuelto": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"idea_id": string,"mensaje_id"?: string | null,"motivo": string,"persona_id": string,"resuelto"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"idea_id"?: string,"mensaje_id"?: string | null,"motivo"?: string,"persona_id"?: string,"resuelto"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_ideas_reportes_idea_id_fkey"
      columns: ["idea_id"]
isOneToOne: false
      referencedRelation: "alumnos_ideas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_reportes_mensaje_id_fkey"
      columns: ["mensaje_id"]
isOneToOne: false
      referencedRelation: "alumnos_ideas_mensajes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_reportes_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_ideas_reportes_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_intereses": {
                  Row: {
                    "estrellas": number,"interes_id": number,"persona_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "estrellas": number,"interes_id": number,"persona_id": string,"updated_at"?: string
                  }
                  Update: {
                    "estrellas"?: number,"interes_id"?: number,"persona_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_intereses_interes_id_fkey"
      columns: ["interes_id"]
isOneToOne: false
      referencedRelation: "alumnos_intereses_maestro"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_intereses_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_intereses_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"alumnos_intereses_historial": {
                  Row: {
                    "cambiado_en": string,"estrellas_antes": number | null,"estrellas_despues": number | null,"id": number,"interes_id": number,"persona_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cambiado_en"?: string,"estrellas_antes"?: number | null,"estrellas_despues"?: number | null,"id"?: never,"interes_id": number,"persona_id": string
                  }
                  Update: {
                    "cambiado_en"?: string,"estrellas_antes"?: number | null,"estrellas_despues"?: number | null,"id"?: never,"interes_id"?: number,"persona_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"alumnos_intereses_maestro": {
                  Row: {
                    "activo": boolean,"created_at": string,"id": number,"nombre": string,"orden": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"id"?: never,"nombre": string,"orden"?: number
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"id"?: never,"nombre"?: string,"orden"?: number
                  }
                  Relationships: [
                    
                  ]
                },"alumnos_perfiles": {
                  Row: {
                    "busca_equipo": boolean,"persona_id": string,"sobre_mi": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "busca_equipo"?: boolean,"persona_id": string,"sobre_mi"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "busca_equipo"?: boolean,"persona_id"?: string,"sobre_mi"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_perfiles_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: true
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alumnos_perfiles_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: true
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"austral_contactos_mentores": {
                  Row: {
                    "acepta_consultas_otros": boolean,"actualizado_at": string,"email_contacto": string,"especialidades": (string)[],"industria": string,"mentor_id": string,"modalidad": string,"publicado": boolean,"telefono_contacto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acepta_consultas_otros"?: boolean,"actualizado_at"?: string,"email_contacto"?: string,"especialidades"?: (string)[],"industria"?: string,"mentor_id": string,"modalidad"?: string,"publicado"?: boolean,"telefono_contacto"?: string
                  }
                  Update: {
                    "acepta_consultas_otros"?: boolean,"actualizado_at"?: string,"email_contacto"?: string,"especialidades"?: (string)[],"industria"?: string,"mentor_id"?: string,"modalidad"?: string,"publicado"?: boolean,"telefono_contacto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "austral_contactos_mentores_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: true
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_contactos_mentores_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: true
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"austral_documentos": {
                  Row: {
                    "bytes": number,"created_at": string,"id": string,"nombre": string,"proyecto_id": string,"ruta": string,"subido_por": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bytes": number,"created_at"?: string,"id"?: string,"nombre": string,"proyecto_id": string,"ruta": string,"subido_por"?: string | null,"tipo": string
                  }
                  Update: {
                    "bytes"?: number,"created_at"?: string,"id"?: string,"nombre"?: string,"proyecto_id"?: string,"ruta"?: string,"subido_por"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "austral_documentos_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_documentos_subido_por_fkey"
      columns: ["subido_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_documentos_subido_por_fkey"
      columns: ["subido_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"austral_material_usos": {
                  Row: {
                    "created_at": string,"id": number,"jurado_id": string,"material_id": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"jurado_id": string,"material_id": string,"tipo": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"jurado_id"?: string,"material_id"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "austral_material_usos_jurado_id_fkey"
      columns: ["jurado_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_material_usos_jurado_id_fkey"
      columns: ["jurado_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_material_usos_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "austral_materiales"
      referencedColumns: ["id"]
    }
                  ]
                },"austral_materiales": {
                  Row: {
                    "aprobado_at": string | null,"aprobado_por": string | null,"aviso": string | null,"contexto": string | null,"documentos": (string)[],"estado": string,"fuentes": (string)[],"generado_at": string | null,"generado_por": string | null,"guion": string | null,"id": string,"problematica": string | null,"proyecto_id": string,"sector": string | null,"segundos_generacion": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aprobado_at"?: string | null,"aprobado_por"?: string | null,"aviso"?: string | null,"contexto"?: string | null,"documentos"?: (string)[],"estado"?: string,"fuentes"?: (string)[],"generado_at"?: string | null,"generado_por"?: string | null,"guion"?: string | null,"id"?: string,"problematica"?: string | null,"proyecto_id": string,"sector"?: string | null,"segundos_generacion"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "aprobado_at"?: string | null,"aprobado_por"?: string | null,"aviso"?: string | null,"contexto"?: string | null,"documentos"?: (string)[],"estado"?: string,"fuentes"?: (string)[],"generado_at"?: string | null,"generado_por"?: string | null,"guion"?: string | null,"id"?: string,"problematica"?: string | null,"proyecto_id"?: string,"sector"?: string | null,"segundos_generacion"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "austral_materiales_aprobado_por_fkey"
      columns: ["aprobado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_materiales_aprobado_por_fkey"
      columns: ["aprobado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_materiales_generado_por_fkey"
      columns: ["generado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_materiales_generado_por_fkey"
      columns: ["generado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_materiales_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: true
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"austral_participaciones": {
                  Row: {
                    "actividad": string,"creado_por": string,"created_at": string,"evento_id": string | null,"fecha": string,"id": string,"persona_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actividad": string,"creado_por": string,"created_at"?: string,"evento_id"?: string | null,"fecha": string,"id"?: string,"persona_id": string
                  }
                  Update: {
                    "actividad"?: string,"creado_por"?: string,"created_at"?: string,"evento_id"?: string | null,"fecha"?: string,"id"?: string,"persona_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "austral_participaciones_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_participaciones_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_participaciones_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_participaciones_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_participaciones_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"austral_propuestas_incentivos": {
                  Row: {
                    "alternativa": string,"categoria": string,"creado_por": string,"created_at": string,"estado": string,"fundamento": string,"id": string,"participaciones_consideradas": number,"persona_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alternativa": string,"categoria": string,"creado_por": string,"created_at"?: string,"estado"?: string,"fundamento": string,"id"?: string,"participaciones_consideradas": number,"persona_id": string
                  }
                  Update: {
                    "alternativa"?: string,"categoria"?: string,"creado_por"?: string,"created_at"?: string,"estado"?: string,"fundamento"?: string,"id"?: string,"participaciones_consideradas"?: number,"persona_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "austral_propuestas_incentivos_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_propuestas_incentivos_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_propuestas_incentivos_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_propuestas_incentivos_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"austral_solicitudes_contacto": {
                  Row: {
                    "alumno_id": string,"created_at": string,"estado": string,"id": string,"mentor_id": string,"motivo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alumno_id": string,"created_at"?: string,"estado"?: string,"id"?: string,"mentor_id": string,"motivo": string
                  }
                  Update: {
                    "alumno_id"?: string,"created_at"?: string,"estado"?: string,"id"?: string,"mentor_id"?: string,"motivo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "austral_solicitudes_contacto_alumno_id_fkey"
      columns: ["alumno_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_solicitudes_contacto_alumno_id_fkey"
      columns: ["alumno_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_solicitudes_contacto_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_solicitudes_contacto_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"austral_vinculos_mentor_proyecto": {
                  Row: {
                    "mentor_id": string,"proyecto_id": string,"registrado_at": string,"registrado_por": string
                  }
                  ComputedFields: never
                  Insert: {
                    "mentor_id": string,"proyecto_id": string,"registrado_at"?: string,"registrado_por": string
                  }
                  Update: {
                    "mentor_id"?: string,"proyecto_id"?: string,"registrado_at"?: string,"registrado_por"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "austral_vinculos_mentor_proyecto_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_vinculos_mentor_proyecto_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_vinculos_mentor_proyecto_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_vinculos_mentor_proyecto_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "austral_vinculos_mentor_proyecto_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"eventos": {
                  Row: {
                    "created_at": string,"fin": string | null,"id": string,"inicio": string,"lugar": string | null,"nombre": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fin"?: string | null,"id"?: string,"inicio": string,"lugar"?: string | null,"nombre": string,"tipo": string
                  }
                  Update: {
                    "created_at"?: string,"fin"?: string | null,"id"?: string,"inicio"?: string,"lugar"?: string | null,"nombre"?: string,"tipo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"jurado_ausencias": {
                  Row: {
                    "evento_id": string,"marcado_at": string,"marcado_por": string | null,"proyecto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "evento_id": string,"marcado_at"?: string,"marcado_por"?: string | null,"proyecto_id": string
                  }
                  Update: {
                    "evento_id"?: string,"marcado_at"?: string,"marcado_por"?: string | null,"proyecto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_ausencias_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_ausencias_marcado_por_fkey"
      columns: ["marcado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_ausencias_marcado_por_fkey"
      columns: ["marcado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_ausencias_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_criterios": {
                  Row: {
                    "created_at": string,"descripcion": string | null,"es_base": boolean,"id": string,"nombre": string,"orden": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"descripcion"?: string | null,"es_base"?: boolean,"id"?: string,"nombre": string,"orden"?: number
                  }
                  Update: {
                    "created_at"?: string,"descripcion"?: string | null,"es_base"?: boolean,"id"?: string,"nombre"?: string,"orden"?: number
                  }
                  Relationships: [
                    
                  ]
                },"jurado_devolucion_envios": {
                  Row: {
                    "created_at": string,"email": string,"error": string | null,"estado": string,"evento_id": string,"id": string,"persona_id": string | null,"proyecto_id": string,"resend_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"error"?: string | null,"estado": string,"evento_id": string,"id"?: string,"persona_id"?: string | null,"proyecto_id": string,"resend_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"error"?: string | null,"estado"?: string,"evento_id"?: string,"id"?: string,"persona_id"?: string | null,"proyecto_id"?: string,"resend_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_devolucion_envios_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_devolucion_envios_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_devolucion_envios_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_devolucion_envios_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_devoluciones": {
                  Row: {
                    "actualizada_at": string | null,"comentarios": (string)[],"evaluaciones": number,"evento_id": string,"huella": string | null,"motivo_correccion": string | null,"promedio_general": number | null,"promedios": NonNullable<Json>,"propuestas": (string)[],"proyecto_id": string,"revisada_at": string | null,"revisada_por": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizada_at"?: string | null,"comentarios"?: (string)[],"evaluaciones"?: number,"evento_id": string,"huella"?: string | null,"motivo_correccion"?: string | null,"promedio_general"?: number | null,"promedios"?: NonNullable<Json>,"propuestas"?: (string)[],"proyecto_id": string,"revisada_at"?: string | null,"revisada_por"?: string | null
                  }
                  Update: {
                    "actualizada_at"?: string | null,"comentarios"?: (string)[],"evaluaciones"?: number,"evento_id"?: string,"huella"?: string | null,"motivo_correccion"?: string | null,"promedio_general"?: number | null,"promedios"?: NonNullable<Json>,"propuestas"?: (string)[],"proyecto_id"?: string,"revisada_at"?: string | null,"revisada_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_devoluciones_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_devoluciones_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_devoluciones_revisada_por_fkey"
      columns: ["revisada_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_devoluciones_revisada_por_fkey"
      columns: ["revisada_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_devoluciones_historial": {
                  Row: {
                    "cambiado_at": string,"cambiado_por": string | null,"comentarios": (string)[],"evento_id": string,"id": string,"motivo": string,"propuestas": (string)[],"proyecto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cambiado_at"?: string,"cambiado_por"?: string | null,"comentarios": (string)[],"evento_id": string,"id"?: string,"motivo": string,"propuestas": (string)[],"proyecto_id": string
                  }
                  Update: {
                    "cambiado_at"?: string,"cambiado_por"?: string | null,"comentarios"?: (string)[],"evento_id"?: string,"id"?: string,"motivo"?: string,"propuestas"?: (string)[],"proyecto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_devoluciones_historial_cambiado_por_fkey"
      columns: ["cambiado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_devoluciones_historial_cambiado_por_fkey"
      columns: ["cambiado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_devoluciones_historial_evento_id_proyecto_id_fkey"
      columns: ["evento_id","proyecto_id"]
isOneToOne: false
      referencedRelation: "jurado_devoluciones"
      referencedColumns: ["evento_id","proyecto_id"]
    }
                  ]
                },"jurado_devoluciones_vistos": {
                  Row: {
                    "comentarios": (string)[],"evento_id": string,"propuestas": (string)[],"proyecto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comentarios"?: (string)[],"evento_id": string,"propuestas"?: (string)[],"proyecto_id": string
                  }
                  Update: {
                    "comentarios"?: (string)[],"evento_id"?: string,"propuestas"?: (string)[],"proyecto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_devoluciones_vistos_evento_id_proyecto_id_fkey"
      columns: ["evento_id","proyecto_id"]
isOneToOne: true
      referencedRelation: "jurado_devoluciones"
      referencedColumns: ["evento_id","proyecto_id"]
    }
                  ]
                },"jurado_envios": {
                  Row: {
                    "asunto": string,"created_at": string,"email": string,"error": string | null,"estado": string,"evento_id": string,"id": string,"persona_id": string | null,"programado_para": string | null,"resend_id": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asunto": string,"created_at"?: string,"email": string,"error"?: string | null,"estado": string,"evento_id": string,"id"?: string,"persona_id"?: string | null,"programado_para"?: string | null,"resend_id"?: string | null,"tipo": string
                  }
                  Update: {
                    "asunto"?: string,"created_at"?: string,"email"?: string,"error"?: string | null,"estado"?: string,"evento_id"?: string,"id"?: string,"persona_id"?: string | null,"programado_para"?: string | null,"resend_id"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_envios_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_envios_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_envios_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_evaluaciones": {
                  Row: {
                    "comentarios": string | null,"created_at": string,"evento_id": string | null,"id": string,"jurado_id": string,"propuesta_valor": string | null,"proyecto_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comentarios"?: string | null,"created_at"?: string,"evento_id"?: string | null,"id"?: string,"jurado_id": string,"propuesta_valor"?: string | null,"proyecto_id": string,"updated_at"?: string
                  }
                  Update: {
                    "comentarios"?: string | null,"created_at"?: string,"evento_id"?: string | null,"id"?: string,"jurado_id"?: string,"propuesta_valor"?: string | null,"proyecto_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_evaluaciones_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_evaluaciones_jurado_id_fkey"
      columns: ["jurado_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_evaluaciones_jurado_id_fkey"
      columns: ["jurado_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_evaluaciones_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_evento_criterios": {
                  Row: {
                    "criterio_id": string,"evento_id": string,"orden": number
                  }
                  ComputedFields: never
                  Insert: {
                    "criterio_id": string,"evento_id": string,"orden"?: number
                  }
                  Update: {
                    "criterio_id"?: string,"evento_id"?: string,"orden"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_evento_criterios_criterio_id_fkey"
      columns: ["criterio_id"]
isOneToOne: false
      referencedRelation: "jurado_criterios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_evento_criterios_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_fichas": {
                  Row: {
                    "etapa": string | null,"link_presentacion": string | null,"mercado": string | null,"modelo_negocio": string | null,"problema": string | null,"propuesta_valor": string | null,"proyecto_id": string,"solucion": string | null,"traccion": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "etapa"?: string | null,"link_presentacion"?: string | null,"mercado"?: string | null,"modelo_negocio"?: string | null,"problema"?: string | null,"propuesta_valor"?: string | null,"proyecto_id": string,"solucion"?: string | null,"traccion"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "etapa"?: string | null,"link_presentacion"?: string | null,"mercado"?: string | null,"modelo_negocio"?: string | null,"problema"?: string | null,"propuesta_valor"?: string | null,"proyecto_id"?: string,"solucion"?: string | null,"traccion"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_fichas_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: true
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_material_post": {
                  Row: {
                    "evento_id": string,"foto_1": string | null,"foto_2": string | null,"foto_3": string | null,"mensaje": string | null,"updated_at": string,"video": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "evento_id": string,"foto_1"?: string | null,"foto_2"?: string | null,"foto_3"?: string | null,"mensaje"?: string | null,"updated_at"?: string,"video"?: string | null
                  }
                  Update: {
                    "evento_id"?: string,"foto_1"?: string | null,"foto_2"?: string | null,"foto_3"?: string | null,"mensaje"?: string | null,"updated_at"?: string,"video"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_material_post_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: true
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_publicaciones": {
                  Row: {
                    "evento_id": string,"publicada_at": string,"publicada_por": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "evento_id": string,"publicada_at"?: string,"publicada_por"?: string | null
                  }
                  Update: {
                    "evento_id"?: string,"publicada_at"?: string,"publicada_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_publicaciones_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: true
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_publicaciones_publicada_por_fkey"
      columns: ["publicada_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_publicaciones_publicada_por_fkey"
      columns: ["publicada_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_puntajes": {
                  Row: {
                    "criterio_id": string,"evaluacion_id": string,"puntaje": number
                  }
                  ComputedFields: never
                  Insert: {
                    "criterio_id": string,"evaluacion_id": string,"puntaje": number
                  }
                  Update: {
                    "criterio_id"?: string,"evaluacion_id"?: string,"puntaje"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_puntajes_criterio_id_fkey"
      columns: ["criterio_id"]
isOneToOne: false
      referencedRelation: "jurado_criterios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_puntajes_evaluacion_id_fkey"
      columns: ["evaluacion_id"]
isOneToOne: false
      referencedRelation: "jurado_evaluaciones"
      referencedColumns: ["id"]
    }
                  ]
                },"jurado_salon_jurados": {
                  Row: {
                    "evento_id": string,"jurado_id": string,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "evento_id": string,"jurado_id": string,"salon_id": string
                  }
                  Update: {
                    "evento_id"?: string,"jurado_id"?: string,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_salon_jurados_jurado_id_fkey"
      columns: ["jurado_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_salon_jurados_jurado_id_fkey"
      columns: ["jurado_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_salon_jurados_salon_id_evento_id_fkey"
      columns: ["salon_id","evento_id"]
isOneToOne: false
      referencedRelation: "jurado_salones"
      referencedColumns: ["id","evento_id"]
    }
                  ]
                },"jurado_salon_proyectos": {
                  Row: {
                    "evento_id": string,"proyecto_id": string,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "evento_id": string,"proyecto_id": string,"salon_id": string
                  }
                  Update: {
                    "evento_id"?: string,"proyecto_id"?: string,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_salon_proyectos_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jurado_salon_proyectos_salon_id_evento_id_fkey"
      columns: ["salon_id","evento_id"]
isOneToOne: false
      referencedRelation: "jurado_salones"
      referencedColumns: ["id","evento_id"]
    }
                  ]
                },"jurado_salones": {
                  Row: {
                    "created_at": string,"evento_id": string,"id": string,"nombre": string,"orden": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evento_id": string,"id"?: string,"nombre": string,"orden"?: number
                  }
                  Update: {
                    "created_at"?: string,"evento_id"?: string,"id"?: string,"nombre"?: string,"orden"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurado_salones_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    }
                  ]
                },"mentores_encuestas": {
                  Row: {
                    "con_quien": string,"created_at": string,"escalada_at": string | null,"estado": string,"grave": boolean | null,"grave_motivo": string | null,"id": string,"mail_error": string | null,"mail_estado": string | null,"mejorar": string | null,"papel": string,"persona_id": string,"proyecto_nombre": string,"puntaje": number | null,"recordatorio_at": string | null,"respondida_at": string | null,"reunion_id": string,"reunion_inicio": string,"sirvio": string | null,"urgente": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "con_quien": string,"created_at"?: string,"escalada_at"?: string | null,"estado"?: string,"grave"?: boolean | null,"grave_motivo"?: string | null,"id"?: string,"mail_error"?: string | null,"mail_estado"?: string | null,"mejorar"?: string | null,"papel": string,"persona_id": string,"proyecto_nombre": string,"puntaje"?: number | null,"recordatorio_at"?: string | null,"respondida_at"?: string | null,"reunion_id": string,"reunion_inicio": string,"sirvio"?: string | null,"urgente"?: string | null
                  }
                  Update: {
                    "con_quien"?: string,"created_at"?: string,"escalada_at"?: string | null,"estado"?: string,"grave"?: boolean | null,"grave_motivo"?: string | null,"id"?: string,"mail_error"?: string | null,"mail_estado"?: string | null,"mejorar"?: string | null,"papel"?: string,"persona_id"?: string,"proyecto_nombre"?: string,"puntaje"?: number | null,"recordatorio_at"?: string | null,"respondida_at"?: string | null,"reunion_id"?: string,"reunion_inicio"?: string,"sirvio"?: string | null,"urgente"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentores_encuestas_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_encuestas_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_encuestas_reunion_id_fkey"
      columns: ["reunion_id"]
isOneToOne: false
      referencedRelation: "mentores_reuniones"
      referencedColumns: ["id"]
    }
                  ]
                },"mentores_feedback_resumenes": {
                  Row: {
                    "aviso": string | null,"con_ia": boolean,"created_at": string,"id": string,"pedidas": number,"respuestas": number,"resumen": string,"reunion_id": string,"util": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aviso"?: string | null,"con_ia": boolean,"created_at"?: string,"id"?: string,"pedidas": number,"respuestas": number,"resumen": string,"reunion_id": string,"util"?: boolean | null
                  }
                  Update: {
                    "aviso"?: string | null,"con_ia"?: boolean,"created_at"?: string,"id"?: string,"pedidas"?: number,"respuestas"?: number,"resumen"?: string,"reunion_id"?: string,"util"?: boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentores_feedback_resumenes_reunion_id_fkey"
      columns: ["reunion_id"]
isOneToOne: true
      referencedRelation: "mentores_reuniones"
      referencedColumns: ["id"]
    }
                  ]
                },"mentores_match_pedidos": {
                  Row: {
                    "alerta_revisada_at": string | null,"alerta_revisada_por": string | null,"aviso": string | null,"created_at": string,"id": string,"pedido_por": string | null,"proyecto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alerta_revisada_at"?: string | null,"alerta_revisada_por"?: string | null,"aviso"?: string | null,"created_at"?: string,"id"?: string,"pedido_por"?: string | null,"proyecto_id": string
                  }
                  Update: {
                    "alerta_revisada_at"?: string | null,"alerta_revisada_por"?: string | null,"aviso"?: string | null,"created_at"?: string,"id"?: string,"pedido_por"?: string | null,"proyecto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentores_match_pedidos_alerta_revisada_por_fkey"
      columns: ["alerta_revisada_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_match_pedidos_alerta_revisada_por_fkey"
      columns: ["alerta_revisada_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_match_pedidos_pedido_por_fkey"
      columns: ["pedido_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_match_pedidos_pedido_por_fkey"
      columns: ["pedido_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_match_pedidos_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"mentores_perfil": {
                  Row: {
                    "anios_experiencia": number | null,"areas_ayuda": string | null,"bio": string | null,"cargo": string | null,"created_at": string,"ediciones_post_publicacion": number,"empresa": string | null,"estado": string,"industria": string | null,"iniciado_at": string,"linkedin_url": string | null,"persona_id": string,"publicado_at": string | null,"texto_original": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anios_experiencia"?: number | null,"areas_ayuda"?: string | null,"bio"?: string | null,"cargo"?: string | null,"created_at"?: string,"ediciones_post_publicacion"?: number,"empresa"?: string | null,"estado"?: string,"industria"?: string | null,"iniciado_at"?: string,"linkedin_url"?: string | null,"persona_id": string,"publicado_at"?: string | null,"texto_original"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "anios_experiencia"?: number | null,"areas_ayuda"?: string | null,"bio"?: string | null,"cargo"?: string | null,"created_at"?: string,"ediciones_post_publicacion"?: number,"empresa"?: string | null,"estado"?: string,"industria"?: string | null,"iniciado_at"?: string,"linkedin_url"?: string | null,"persona_id"?: string,"publicado_at"?: string | null,"texto_original"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentores_perfil_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: true
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_perfil_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: true
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"mentores_perfil_eventos": {
                  Row: {
                    "created_at": string,"detalle": Json | null,"id": string,"persona_id": string,"revisado": boolean,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"detalle"?: Json | null,"id"?: string,"persona_id": string,"revisado"?: boolean,"tipo": string
                  }
                  Update: {
                    "created_at"?: string,"detalle"?: Json | null,"id"?: string,"persona_id"?: string,"revisado"?: boolean,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentores_perfil_eventos_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_perfil_eventos_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"mentores_resumenes": {
                  Row: {
                    "asunto": string,"aviso": string | null,"aviso_mail_at": string | null,"aviso_util": boolean | null,"con_ia": boolean,"created_at": string,"email": string,"error": string | null,"estado": string,"html": string,"id": string,"le_sirvio": boolean | null,"leido_at": string | null,"minutos_ahorrados": number | null,"programado_para": string | null,"resend_id": string | null,"reunion_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asunto": string,"aviso"?: string | null,"aviso_mail_at"?: string | null,"aviso_util"?: boolean | null,"con_ia": boolean,"created_at"?: string,"email": string,"error"?: string | null,"estado": string,"html": string,"id"?: string,"le_sirvio"?: boolean | null,"leido_at"?: string | null,"minutos_ahorrados"?: number | null,"programado_para"?: string | null,"resend_id"?: string | null,"reunion_id": string
                  }
                  Update: {
                    "asunto"?: string,"aviso"?: string | null,"aviso_mail_at"?: string | null,"aviso_util"?: boolean | null,"con_ia"?: boolean,"created_at"?: string,"email"?: string,"error"?: string | null,"estado"?: string,"html"?: string,"id"?: string,"le_sirvio"?: boolean | null,"leido_at"?: string | null,"minutos_ahorrados"?: number | null,"programado_para"?: string | null,"resend_id"?: string | null,"reunion_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentores_resumenes_reunion_id_fkey"
      columns: ["reunion_id"]
isOneToOne: false
      referencedRelation: "mentores_reuniones"
      referencedColumns: ["id"]
    }
                  ]
                },"mentores_reuniones": {
                  Row: {
                    "cancelada": boolean,"cargada_por": string | null,"created_at": string,"feedback_pedido_at": string | null,"id": string,"inicio": string,"lugar": string | null,"mentor_id": string,"notas": string | null,"proximos_pasos": string | null,"proyecto_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelada"?: boolean,"cargada_por"?: string | null,"created_at"?: string,"feedback_pedido_at"?: string | null,"id"?: string,"inicio": string,"lugar"?: string | null,"mentor_id": string,"notas"?: string | null,"proximos_pasos"?: string | null,"proyecto_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cancelada"?: boolean,"cargada_por"?: string | null,"created_at"?: string,"feedback_pedido_at"?: string | null,"id"?: string,"inicio"?: string,"lugar"?: string | null,"mentor_id"?: string,"notas"?: string | null,"proximos_pasos"?: string | null,"proyecto_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentores_reuniones_cargada_por_fkey"
      columns: ["cargada_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_reuniones_cargada_por_fkey"
      columns: ["cargada_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_reuniones_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_reuniones_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_reuniones_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"mentores_sugerencias": {
                  Row: {
                    "afinidad": number,"calificado_at": string | null,"calificado_por": string | null,"created_at": string,"decidido_at": string | null,"decidido_por": string | null,"estado": string,"id": string,"mentor_id": string,"minutos_ahorrados": number | null,"motivo": string,"motivo_quitado": string | null,"opinion": string | null,"pedido_id": string,"proyecto_id": string,"quitado_at": string | null,"quitado_por": string | null,"satisfaccion": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "afinidad": number,"calificado_at"?: string | null,"calificado_por"?: string | null,"created_at"?: string,"decidido_at"?: string | null,"decidido_por"?: string | null,"estado"?: string,"id"?: string,"mentor_id": string,"minutos_ahorrados"?: number | null,"motivo": string,"motivo_quitado"?: string | null,"opinion"?: string | null,"pedido_id": string,"proyecto_id": string,"quitado_at"?: string | null,"quitado_por"?: string | null,"satisfaccion"?: number | null
                  }
                  Update: {
                    "afinidad"?: number,"calificado_at"?: string | null,"calificado_por"?: string | null,"created_at"?: string,"decidido_at"?: string | null,"decidido_por"?: string | null,"estado"?: string,"id"?: string,"mentor_id"?: string,"minutos_ahorrados"?: number | null,"motivo"?: string,"motivo_quitado"?: string | null,"opinion"?: string | null,"pedido_id"?: string,"proyecto_id"?: string,"quitado_at"?: string | null,"quitado_por"?: string | null,"satisfaccion"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentores_sugerencias_calificado_por_fkey"
      columns: ["calificado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_sugerencias_calificado_por_fkey"
      columns: ["calificado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_sugerencias_decidido_por_fkey"
      columns: ["decidido_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_sugerencias_decidido_por_fkey"
      columns: ["decidido_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_sugerencias_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_sugerencias_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_sugerencias_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "mentores_match_pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_sugerencias_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_sugerencias_quitado_por_fkey"
      columns: ["quitado_por"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentores_sugerencias_quitado_por_fkey"
      columns: ["quitado_por"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    }
                  ]
                },"personas": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"nombre": string,"rol": Database["public"]['Enums']["rol"]
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol"]
                  }
                  Relationships: [
                    
                  ]
                },"proyecto_integrantes": {
                  Row: {
                    "persona_id": string,"proyecto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "persona_id": string,"proyecto_id": string
                  }
                  Update: {
                    "persona_id"?: string,"proyecto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proyecto_integrantes_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proyecto_integrantes_persona_id_fkey"
      columns: ["persona_id"]
isOneToOne: false
      referencedRelation: "personas_contacto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proyecto_integrantes_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"proyectos": {
                  Row: {
                    "created_at": string,"descripcion": string | null,"estado": string,"id": string,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"descripcion"?: string | null,"estado"?: string,"id"?: string,"nombre": string
                  }
                  Update: {
                    "created_at"?: string,"descripcion"?: string | null,"estado"?: string,"id"?: string,"nombre"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "personas_contacto": {
                  Row: {
                    "email": string | null,"id": string | null,"nombre": string | null,"rol": Database["public"]['Enums']["rol"] | null
                  }
                  ComputedFields: never
                  Insert: {
                           "email"?: never,"id"?: string | null,"nombre"?: string | null,"rol"?: Database["public"]['Enums']["rol"] | null
                         }
                        Update: {
                           "email"?: never,"id"?: string | null,"nombre"?: string | null,"rol"?: Database["public"]['Enums']["rol"] | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "alumnos_calcular_intereses_grupo":
{ Args: { "p_proyecto": string }; Returns: number
                           },
"alumnos_es_mi_proyecto":
{ Args: { "p_proyecto": string }; Returns: boolean
                           },
"alumnos_guardar_perfil":
{ Args: { "p_busca_equipo": boolean,"p_carrera_id": number,"p_intereses": Json,"p_sobre_mi": string }; Returns: undefined
                           },
"alumnos_soy_integrante":
{ Args: { "p_proyecto": string }; Returns: boolean
                           },
"alumnos_soy_mentor":
{ Args: { "p_proyecto": string }; Returns: boolean
                           },
"alumnos_yo":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"austral_me_toca":
{ Args: { "p_proyecto": string }; Returns: boolean
                           },
"austral_mis_proyectos":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"austral_yo":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"es_servicio":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"jurado_criterios_aplicar":
{ Args: { "p_evento": string,"p_origen"?: string }; Returns: number
                           },
"jurado_criterios_fijar_usados":
{ Args: { "p_evento": string }; Returns: number
                           },
"jurado_evento_bloqueado":
{ Args: { "p_evento": string }; Returns: boolean
                           },
"jurado_evento_publicado":
{ Args: { "p_evento": string }; Returns: boolean
                           },
"jurado_guardar_salones":
{ Args: { "p_evento": string,"p_jurados": Json,"p_proyectos": Json }; Returns: undefined
                           },
"jurado_huella":
{ Args: { "p_evento": string,"p_proyecto": string }; Returns: string
                           },
"jurado_me_toca":
{ Args: { "p_evento": string,"p_proyecto": string }; Returns: boolean
                           },
"jurado_publicar_evento":
{ Args: { "p_evento": string }; Returns: number
                           },
"mi_persona_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mi_rol":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["rol"]
                           }
          }
          Enums: {
            "rol": "alumno"|"mentor"|"jurado"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "rol": ["alumno", "mentor", "jurado", "admin"]
          }
        }
} as const
