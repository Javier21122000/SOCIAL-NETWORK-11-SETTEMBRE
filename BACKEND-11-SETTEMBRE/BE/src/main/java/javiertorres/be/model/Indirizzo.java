package javiertorres.be.model;

import jakarta.persistence.Embeddable;
import lombok.*;

@Embeddable
@Data @NoArgsConstructor @AllArgsConstructor
public class Indirizzo {
    private String luogo;
    private Double latitudine;
    private Double longitudine;
}
