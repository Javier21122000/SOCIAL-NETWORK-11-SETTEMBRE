package javiertorres.be.repository;
import javiertorres.be.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;
public interface PostRepository extends JpaRepository<Post, UUID> {
    // Il feed mostra prima i post più recenti; i post senza data restano in fondo.
    @Query("select p from Post p order by p.createdAt desc nulls last")
    List<Post> findAllNewestFirst();
}
