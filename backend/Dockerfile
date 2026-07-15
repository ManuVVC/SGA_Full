# Utilizar una imagen base ligera de Python 3.11
FROM python:3.11-slim

# Configurar variables de entorno para optimizar Python en Docker
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instalar dependencias del sistema necesarias
# Se añade soporte para Debian Trixie (libaio1t64) y Debian Bullseye/Bookworm (libaio1) como fallback.
# Se instalan también wget y unzip agrupados correctamente para evitar que se omitan en el flujo de ejecución.
RUN apt-get update && \
    (apt-get install -y --no-install-recommends libaio1t64 || apt-get install -y --no-install-recommends libaio1) && \
    apt-get install -y --no-install-recommends wget unzip && \
    rm -rf /var/lib/apt/lists/*

# Crear un enlace simbólico universal para libaio.so.1.
# Debian Trixie instala libaio.so.1t64, pero el Oracle Instant Client busca estrictamente libaio.so.1
RUN ln -s /usr/lib/*/libaio.so.1t64 /usr/lib/libaio.so.1 || \
    ln -s /usr/lib/*/libaio.so.1t64 /lib/libaio.so.1 || true

# Descargar e instalar Oracle Instant Client 19c (versión compatible con Oracle 10g en modo Thick)
WORKDIR /opt/oracle
RUN wget https://download.oracle.com/otn_software/linux/instantclient/1919000/instantclient-basic-linux.x64-19.19.0.0.0dbru.zip \
    && unzip instantclient-basic-linux.x64-19.19.0.0.0dbru.zip \
    && rm -f instantclient-basic-linux.x64-19.19.0.0.0dbru.zip

# Registrar las librerías en el enlazador dinámico del sistema operativo (ldconfig)
# Esto asegura que el sistema y python-oracledb siempre localicen libclntsh.so
RUN echo /opt/oracle/instantclient_19_19 > /etc/ld.so.conf.d/oracle-instantclient.conf && ldconfig

# Configurar variables de entorno para que el sistema y python-oracledb localicen las librerías del cliente de Oracle
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_19_19

# Establecer el directorio de trabajo en el contenedor para la aplicación
WORKDIR /app

# Copiar primero el archivo de requerimientos para aprovechar la caché de Docker
COPY requirements.txt .

# Instalar dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto de archivos del proyecto
COPY . .

# Exponer el puerto por el que se ejecuta la aplicación Flask
EXPOSE 5000

# Comando por defecto para iniciar la aplicación
CMD ["python", "run.py"]
