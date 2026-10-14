-- ==========================================================
-- Script de creación de tablas para el Módulo de Informes
-- Configurables del SGA
-- ==========================================================

-- Tabla principal: Configuración estructural de informes
CREATE TABLE SGA_INFORMES_CONFIG (
    ID                  NUMBER PRIMARY KEY,
    NOMBRE              VARCHAR2(100) NOT NULL,
    TITULO              VARCHAR2(200),
    DESCRIPCION         VARCHAR2(500),
    CATEGORIA           VARCHAR2(100),
    SQL_QUERY           CLOB,
    CODDEFFILTRO        NUMBER,
    COLUMNAS_CONFIG     CLOB,            -- JSON: [{"field":"X","headerName":"Y","flex":1}]
    ORDER_BY            VARCHAR2(500),
    VISIBLE_USUARIOS    NUMBER(1) DEFAULT 1,
    FECHA_CREACION      DATE DEFAULT SYSDATE,
    FECHA_MODIFICACION  DATE DEFAULT SYSDATE
);

-- Tabla de preferencias de usuario por informe
CREATE TABLE SGA_INFORMES_USUARIO (
    ID                  NUMBER PRIMARY KEY,
    ID_INFORME          NUMBER NOT NULL,
    CODOPERADOR         NUMBER NOT NULL,
    COLUMNAS_VISIBLES   CLOB,            -- JSON: ["COL1","COL2"]
    ORDEN_COLUMNAS      CLOB,            -- JSON: ["COL2","COL1"]
    FECHA_MODIFICACION  DATE DEFAULT SYSDATE,
    CONSTRAINT UNQ_INFORMES_USUARIO UNIQUE (ID_INFORME, CODOPERADOR),
    CONSTRAINT FK_INFORMES_USUARIO_INF FOREIGN KEY (ID_INFORME) REFERENCES SGA_INFORMES_CONFIG(ID)
);

-- Secuencias para IDs autoincremento
CREATE SEQUENCE SGA_INFORMES_CONFIG_SEQ START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SGA_INFORMES_USUARIO_SEQ START WITH 1 INCREMENT BY 1;

-- ==========================================================
-- Migración del informe existente de Stock
-- (datos originales de backend/data/informes.json)
-- ==========================================================
INSERT INTO SGA_INFORMES_CONFIG (
    ID, NOMBRE, TITULO, DESCRIPCION, CATEGORIA,
    SQL_QUERY, CODDEFFILTRO, COLUMNAS_CONFIG, ORDER_BY, VISIBLE_USUARIOS
) VALUES (
    SGA_INFORMES_CONFIG_SEQ.NEXTVAL,
    'informe_stock',
    'Informe de Stock',
    'Consulta del stock actual agrupado por artículo y fecha de caducidad',
    'Stock',
    'SELECT CodArticuloAplicacion, NombreArticulo, SUM(Stock) Stock, Sum(Cajas) Cajas, FechaCaducidad FROM VMST_UbicacionesArticulo WHERE STOCKTOTAL >= 0 {FILTROS_DINAMICOS} GROUP BY CodArticuloAplicacion, NombreArticulo, FechaCaducidad',
    110,
    '[{"field":"CODARTICULO","headerName":"Código Artículo","flex":1,"sortable":true,"filter":true},{"field":"NOMBREARTICULO","headerName":"Artículo","flex":2,"sortable":true,"filter":true},{"field":"STOCK","headerName":"Stock","flex":1,"sortable":true,"filter":"agNumberColumnFilter"},{"field":"CAJAS","headerName":"Cajas","flex":1,"sortable":true,"filter":"agNumberColumnFilter"},{"field":"FECHACADUCIDAD","headerName":"F. Caducidad","flex":1,"sortable":true,"filter":true}]',
    'CodArticuloAplicacion ASC',
    1
);

COMMIT;
