package javiertorres.be.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.*;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor
public class Profilo {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String nome;
    private String fotoProfiloUrl;
    @OneToOne
    @JoinColumn(name = "utente_id", nullable = false)
    private Utente utente;
}
