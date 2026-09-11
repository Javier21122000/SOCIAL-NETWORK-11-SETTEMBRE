package javiertorres.be.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
import java.util.*;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor
public class Utente {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(unique = true, nullable = false)
    private String username;
    @CreationTimestamp
    private Instant createdAt;
    // Lato inverso: serializzarlo creerebbe un ciclo profilo <-> utente nel JSON dei post.
    @OneToOne(mappedBy = "utente", cascade = CascadeType.ALL)
    @JsonIgnore
    private Profilo profilo;
    @OneToMany(mappedBy = "utente", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Messaggio> messaggi = new ArrayList<>();
}
