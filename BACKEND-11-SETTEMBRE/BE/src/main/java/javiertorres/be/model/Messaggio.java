package javiertorres.be.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
import java.util.*;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor
public class Messaggio {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private UUID mittenteId;
    @CreationTimestamp
    private Instant createdAt;
    @ManyToOne
    @JoinColumn(name = "utente_id")
    private Utente utente;
}
