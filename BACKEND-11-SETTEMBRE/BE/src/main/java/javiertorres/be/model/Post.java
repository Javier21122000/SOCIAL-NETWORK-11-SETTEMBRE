package javiertorres.be.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import java.time.Instant;
import java.util.*;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor
public class Post {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(columnDefinition = "TEXT")
    private String didascalia;
    @Embedded
    private Indirizzo indirizzo;
    @ManyToOne
    @JoinColumn(name = "profilo_id")
    private Profilo profilo;
    // BatchSize evita una query per post quando il feed serializza gli allegati.
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    private List<Foto> foto = new ArrayList<>();
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    private List<Documento> documenti = new ArrayList<>();
    private Instant createdAt;
}
