FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
# 빌드된 JAR 파일을 app.jar로 복사
COPY build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
EXPOSE 8080
