# RetailFlow POS Backend

Offline-first Spring Boot backend for RetailFlow POS. Data is persisted in H2 file mode under:

`%USERPROFILE%\RetailFlowPOS\retailflow.mv.db` on Windows.

## Requirements

- Java 21
- Maven 3.9+

## Build and run

```powershell
mvn clean test
mvn spring-boot:run
```

Or build the single executable JAR:

```powershell
mvn clean package
java -jar target/retailflow-pos-1.0.0.jar
```

The API runs at `http://localhost:8080/api/v1`. Swagger UI is available at
`http://localhost:8080/swagger-ui.html`.

Default first-run login:

- Email: `owner@retailflow.local`
- Password: `Admin@1234`

Normal billing, inventory, purchasing, reporting, and local backups are fully
offline. Google Drive is optional and requires
`%USERPROFILE%\RetailFlowPOS\google-credentials.json`.
