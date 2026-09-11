package javiertorres.be.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import java.util.Map;
import java.util.NoSuchElementException;

/** Ogni errore risponde con {"message": "..."}: è il campo che il frontend mostra all'utente. */
@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private static ResponseEntity<Map<String, String>> body(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException exception) {
        return body(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, String>> missingParameter(MissingServletRequestParameterException exception) {
        return body(HttpStatus.BAD_REQUEST, "Parametro obbligatorio mancante: " + exception.getParameterName());
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, String>> missingPart(MissingServletRequestPartException exception) {
        return body(HttpStatus.BAD_REQUEST, "files".equals(exception.getRequestPartName())
                ? "Allega da 1 a 5 file al post"
                : "Parte obbligatoria mancante nel form: " + exception.getRequestPartName());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> invalidParameter(MethodArgumentTypeMismatchException exception) {
        return body(HttpStatus.BAD_REQUEST, "Valore non valido per il parametro " + exception.getName());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException exception) {
        String message = exception.getMessage();
        return body(HttpStatus.NOT_FOUND, message == null || message.isBlank() ? "Risorsa non trovata" : message);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, String>> unsupportedMediaType(HttpMediaTypeNotSupportedException exception) {
        return body(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Tipo di contenuto non supportato: usa multipart/form-data per gli allegati o application/json");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> payloadTooLarge(MaxUploadSizeExceededException exception) {
        return body(HttpStatus.PAYLOAD_TOO_LARGE, "La richiesta supera il limite massimo di 50 MB");
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> serverError(IllegalStateException exception) {
        log.error("Errore interno", exception);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage());
    }

    /**
     * Rete di sicurezza per le eccezioni impreviste. Le eccezioni standard di Spring MVC
     * (404, 405, 406, …) implementano ErrorResponse e vengono rilanciate per non perdere
     * il loro codice di stato originale.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> unexpected(Exception exception) throws Exception {
        if (exception instanceof ErrorResponse) throw exception;
        log.error("Errore non gestito", exception);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Errore interno del server. Riprova più tardi.");
    }
}
