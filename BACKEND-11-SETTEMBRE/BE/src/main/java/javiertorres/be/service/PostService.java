package javiertorres.be.service;

import javiertorres.be.model.*;
import javiertorres.be.repository.PostRepository;
import org.springframework.stereotype.Service;
import java.io.File;
import java.util.*;

@Service
public class PostService {
    private final PostRepository postRepository;
    public PostService(PostRepository postRepository) { this.postRepository = postRepository; }
    public List<Post> findAll() { return postRepository.findAll(); }
    public Post create(Post post) {
        if (post.getFoto() != null) post.getFoto().forEach(f -> f.setPost(post));
        if (post.getDocumenti() != null) post.getDocumenti().forEach(d -> d.setPost(post));
        return postRepository.save(post);
    }
    public void delete(UUID id) { postRepository.deleteById(id); }
    public Post updateDidascalia(UUID id, String didascalia) {
        Post post = postRepository.findById(id).orElseThrow();
        post.setDidascalia(didascalia);
        return postRepository.save(post);
    }
    public String extractTextFromImage(File file) {
        // In futuro: integrazione Tesseract OCR.
        return null;
    }
}
